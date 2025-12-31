/**
 * Check Phase API - Timer-based phase transitions
 * Called periodically to check if phase timer expired
 */

import { getServiceClient } from '../../utils/supabase'
import type { Database, GameSettings } from '../../../shared/types/database.types'
import type { Player } from '../../game/types'
import * as engine from '../../game/engine'
import * as db from '../../services/database'

type Game = Database['public']['Tables']['games']['Row']

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId } = body

  if (!gameId) {
    throw createError({ statusCode: 400, message: 'gameId requis' })
  }

  const client = getServiceClient()

  // Get game
  const { data: game, error: gameError } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    throw createError({ statusCode: 404, message: 'Partie introuvable' })
  }

  // Check if game has a timer
  if (!game.phase_end_at || game.status === 'lobby' || game.status === 'finished') {
    return { advanced: false, reason: 'no_timer' }
  }

  // Check if timer expired
  const phaseEndAt = new Date(game.phase_end_at).getTime()
  if (Date.now() < phaseEndAt) {
    return { advanced: false, reason: 'timer_not_expired', timeLeft: Math.ceil((phaseEndAt - Date.now()) / 1000) }
  }

  // Get players
  const players = await db.getPlayers(client, gameId)
  if (!players.length) {
    throw createError({ statusCode: 500, message: 'Impossible de récupérer les joueurs' })
  }

  const settings = (game.settings as unknown as GameSettings) || engine.getDefaultSettings()

  try {
    switch (game.status) {
      case 'night':
        return await handleNightEnd(client, game, players)

      case 'day':
        return await handleDayEnd(client, game)

      case 'vote':
        return await handleVoteEnd(client, game, players)

      case 'hunter':
        return await handleHunterTimeout(client, game, settings)

      default:
        return { advanced: false, reason: 'invalid_phase' }
    }
  }
  catch (error) {
    console.error('Phase transition error:', error)
    throw createError({ statusCode: 500, message: 'Erreur lors de la transition de phase' })
  }
})

async function handleNightEnd(
  client: ReturnType<typeof getServiceClient>,
  game: Game,
  players: Player[]
) {
  const settings = (game.settings as unknown as GameSettings) || engine.getDefaultSettings()

  // Timer expired - advance to next night role (not directly to day)
  // If current role didn't act in time, they lose their turn
  const result = await engine.advanceToNextNightRole(client, game, players, settings)

  if (result.transitionedToDay) {
    // All night roles done, now in day phase
    const updated = await db.getPlayers(client, game.id)
    const winner = engine.checkVictory(updated)
    return {
      advanced: true,
      from: 'night',
      to: winner ? 'finished' : 'day',
      winner
    }
  }

  // Advanced to next night role
  return {
    advanced: true,
    from: 'night',
    to: 'night',
    nextRole: result.nextRole
  }
}

async function handleDayEnd(
  client: ReturnType<typeof getServiceClient>,
  game: Game
) {
  await engine.transitionToVote(client, game)
  return { advanced: true, from: 'day', to: 'vote' }
}

async function handleVoteEnd(
  client: ReturnType<typeof getServiceClient>,
  game: Game,
  players: Player[]
) {
  // Count votes and resolve
  const votes = await db.getDayVotes(client, game.id, game.day_number)
  const counts = db.countVotes(votes)
  const { targetId, isTie } = db.findMajorityTarget(counts)

  const eliminated = targetId ? players.find(p => p.id === targetId) : null

  // Create result event
  const message = isTie
    ? 'Égalité ! Personne n\'est éliminé.'
    : eliminated
      ? `${eliminated.name} a été éliminé par le village !`
      : 'Aucun vote. Personne n\'est éliminé.'

  await db.createGameEvent(client, game.id, 'vote_result', message, {
    eliminated: eliminated?.id || null,
    isTie
  })

  // Handle elimination
  if (eliminated && !isTie) {
    await db.killPlayer(client, eliminated.id)

    // Hunter check
    if (eliminated.role === 'hunter') {
      await engine.transitionToHunter(client, game.id, eliminated)
      return { advanced: true, from: 'vote', to: 'hunter', eliminated: eliminated.name }
    }
  }

  // Transition to night
  const result = await engine.transitionToNight(client, game)
  return {
    advanced: true,
    from: 'vote',
    to: result.nextPhase,
    winner: result.winner,
    eliminated: eliminated?.name || null
  }
}

async function handleHunterTimeout(
  client: ReturnType<typeof getServiceClient>,
  game: Game,
  settings: GameSettings
) {
  if (game.hunter_target_pending) {
    await db.createGameEvent(client, game.id, 'hunter_timeout',
      'Le chasseur n\'a pas tiré à temps.', { hunterId: game.hunter_target_pending })
  }

  // Check victory
  const players = await db.getPlayers(client, game.id)
  const winner = engine.checkVictory(players)

  if (winner) {
    await engine.endGame(client, game.id, winner)
    return { advanced: true, from: 'hunter', to: 'finished', winner }
  }

  // Transition to night
  const firstNightRole = engine.getFirstNightRole(players)

  await client.from('games').update({
    status: 'night',
    day_number: game.day_number + 1,
    phase_end_at: engine.getPhaseEndTime(settings, 'night').toISOString(),
    hunter_target_pending: null,
    current_night_role: firstNightRole
  }).eq('id', game.id)

  await db.createGameEvent(client, game.id, 'night_start',
    `Nuit ${game.day_number + 1} - Le village s'endort après cette journée tragique.`,
    { day_number: game.day_number + 1 })

  return { advanced: true, from: 'hunter', to: 'night' }
}
