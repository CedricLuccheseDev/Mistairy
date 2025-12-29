import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { Game, Player, GameStatus } from './types'
import { resolveNight, applyNightResult, getNightDeathMessage } from './night'
import { checkVictory, getVictoryMessage } from './victory'

export interface PhaseSettings {
  night_time: number
  discussion_time: number
  vote_time: number
}

export function getDefaultSettings(): PhaseSettings {
  return {
    night_time: 30,
    discussion_time: 120,
    vote_time: 60
  }
}

export function getPhaseEndTime(settings: PhaseSettings, phase: GameStatus): Date {
  const now = Date.now()
  let duration = 0

  switch (phase) {
    case 'night':
      duration = settings.night_time * 1000
      break
    case 'day':
      duration = settings.discussion_time * 1000
      break
    case 'vote':
      duration = settings.vote_time * 1000
      break
  }

  return new Date(now + duration)
}

export async function transitionToDay(
  client: SupabaseClient<Database>,
  game: Game,
  players: Player[]
): Promise<{ deadPlayers: Player[], winner: 'village' | 'werewolf' | null }> {
  // Résoudre la nuit
  const nightResult = await resolveNight(client, game.id, game.day_number, players)
  const deadPlayers = await applyNightResult(client, game.id, nightResult)

  // Créer l'événement
  const message = getNightDeathMessage(deadPlayers)
  await client.from('game_events').insert({
    game_id: game.id,
    event_type: 'night_end',
    message,
    data: { dead: deadPlayers.map(p => ({ id: p.id, name: p.name, role: p.role })) }
  })

  // Vérifier la victoire
  const { data: updatedPlayers } = await client
    .from('players')
    .select('*')
    .eq('game_id', game.id)

  const winner = checkVictory(updatedPlayers || [])

  if (winner) {
    await client.from('games').update({
      status: 'finished',
      winner,
      phase_end_at: null
    }).eq('id', game.id)

    await client.from('game_events').insert({
      game_id: game.id,
      event_type: 'game_end',
      message: getVictoryMessage(winner),
      data: { winner }
    })

    return { deadPlayers, winner }
  }

  // Passer au jour
  const settings = game.settings as PhaseSettings
  const phaseEndAt = getPhaseEndTime(settings, 'day')

  await client.from('games').update({
    status: 'day',
    phase_end_at: phaseEndAt.toISOString()
  }).eq('id', game.id)

  await client.from('game_events').insert({
    game_id: game.id,
    event_type: 'day_start',
    message: `Jour ${game.day_number} - Le village débat. Qui sera éliminé ?`,
    data: {}
  })

  return { deadPlayers, winner: null }
}

export async function transitionToVote(
  client: SupabaseClient<Database>,
  game: Game
): Promise<void> {
  const settings = game.settings as PhaseSettings
  const phaseEndAt = getPhaseEndTime(settings, 'vote')

  await client.from('games').update({
    status: 'vote',
    phase_end_at: phaseEndAt.toISOString()
  }).eq('id', game.id)

  await client.from('game_events').insert({
    game_id: game.id,
    event_type: 'vote_start',
    message: 'Le temps du vote est venu. Désignez celui que vous souhaitez éliminer.',
    data: {}
  })
}

export async function transitionToNight(
  client: SupabaseClient<Database>,
  game: Game,
  eliminatedPlayer: Player | null
): Promise<{ winner: 'village' | 'werewolf' | null }> {
  // Vérifier la victoire après élimination
  const { data: players } = await client
    .from('players')
    .select('*')
    .eq('game_id', game.id)

  const winner = checkVictory(players || [])

  if (winner) {
    await client.from('games').update({
      status: 'finished',
      winner,
      phase_end_at: null
    }).eq('id', game.id)

    await client.from('game_events').insert({
      game_id: game.id,
      event_type: 'game_end',
      message: getVictoryMessage(winner),
      data: { winner }
    })

    return { winner }
  }

  // Passer à la nuit suivante
  const settings = game.settings as PhaseSettings
  const phaseEndAt = getPhaseEndTime(settings, 'night')

  await client.from('games').update({
    status: 'night',
    day_number: game.day_number + 1,
    phase_end_at: phaseEndAt.toISOString()
  }).eq('id', game.id)

  await client.from('game_events').insert({
    game_id: game.id,
    event_type: 'night_start',
    message: `Nuit ${game.day_number + 1} - Le village s'endort. Les loups-garous se réveillent...`,
    data: {}
  })

  return { winner: null }
}
