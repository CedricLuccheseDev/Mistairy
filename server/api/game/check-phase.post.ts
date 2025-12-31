import { getServiceClient } from '../../utils/supabase'
import type { Database, GameSettings } from '../../../shared/types/database.types'
import type { Player} from '../../game/types'
import {
  transitionToDay,
  transitionToVote,
  transitionToNight,
  getDefaultSettings,
  getPhaseEndTime
} from '../../game'
import { resolveVotes, getVoteResultMessage } from '../../game/vote'
import { checkVictory, getVictoryMessage } from '../../game/victory'
import { isHunterDeath } from '../../game/hunter'
import { createGameEvent, killPlayer } from '../../services/gameService'

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
  const now = Date.now()

  if (now < phaseEndAt) {
    return { advanced: false, reason: 'timer_not_expired', timeLeft: Math.ceil((phaseEndAt - now) / 1000) }
  }

  // Get players
  const { data: players } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)

  if (!players) {
    throw createError({ statusCode: 500, message: 'Impossible de récupérer les joueurs' })
  }

  const settings = (game.settings as unknown as GameSettings) || getDefaultSettings()
  const gameTyped = { ...game, settings } as Game & { settings: GameSettings }

  try {
    switch (game.status) {
      case 'night':
        return await handleNightEnd(client, gameTyped, players as Player[])

      case 'day':
        return await handleDayEnd(client, gameTyped)

      case 'vote':
        return await handleVoteEnd(client, gameTyped, players as Player[])

      case 'hunter':
        return await handleHunterTimeout(client, gameTyped, settings)

      default:
        return { advanced: false, reason: 'invalid_phase' }
    }
  }
  catch (error) {
    console.error('Phase transition error:', error)
    throw createError({ statusCode: 500, message: 'Erreur lors de la transition de phase' })
  }
})

// Night -> Day
async function handleNightEnd(
  client: ReturnType<typeof getServiceClient>,
  game: Game & { settings: GameSettings },
  players: Player[]
) {
  const result = await transitionToDay(client, game, players)
  return {
    advanced: true,
    from: 'night',
    to: result.winner ? 'finished' : 'day',
    winner: result.winner,
    deadPlayers: result.deadPlayers.map(p => p.name)
  }
}

// Day -> Vote
async function handleDayEnd(
  client: ReturnType<typeof getServiceClient>,
  game: Game & { settings: GameSettings }
) {
  await transitionToVote(client, game)
  return { advanced: true, from: 'day', to: 'vote' }
}

// Vote -> Night (or Hunter if hunter dies)
async function handleVoteEnd(
  client: ReturnType<typeof getServiceClient>,
  game: Game & { settings: GameSettings },
  players: Player[]
) {
  const voteResult = await resolveVotes(client, game.id, game.day_number, players)

  // Create vote result event
  await createGameEvent(client, game.id, 'vote_result', getVoteResultMessage(voteResult), {
    eliminated: voteResult.eliminated?.name || null,
    isTie: voteResult.isTie
  })

  let eliminatedPlayer: Player | null = null

  if (voteResult.eliminated && !voteResult.isTie) {
    eliminatedPlayer = voteResult.eliminated
    await killPlayer(client, eliminatedPlayer.id)

    // Check if hunter was eliminated
    if (isHunterDeath(eliminatedPlayer)) {
      await createGameEvent(
        client,
        game.id,
        'hunter_death',
        `${eliminatedPlayer.name} était le chasseur ! Il peut emporter quelqu'un avec lui.`,
        { hunterId: eliminatedPlayer.id }
      )

      await client.from('games').update({
        status: 'hunter',
        hunter_target_pending: eliminatedPlayer.id,
        phase_end_at: new Date(Date.now() + 30000).toISOString()
      }).eq('id', game.id)

      return {
        advanced: true,
        from: 'vote',
        to: 'hunter',
        eliminated: eliminatedPlayer.name
      }
    }
  }

  // Transition to night
  const result = await transitionToNight(client, game, eliminatedPlayer)
  return {
    advanced: true,
    from: 'vote',
    to: result.winner ? 'finished' : 'night',
    winner: result.winner,
    eliminated: eliminatedPlayer?.name || null
  }
}

// Hunter timeout -> Night
async function handleHunterTimeout(
  client: ReturnType<typeof getServiceClient>,
  game: Game & { settings: GameSettings },
  settings: GameSettings
) {
  const hunterId = game.hunter_target_pending

  if (hunterId) {
    await createGameEvent(client, game.id, 'hunter_timeout', 'Le chasseur n\'a pas tiré à temps.', { hunterId })
  }

  // Check victory
  const { data: updatedPlayers } = await client
    .from('players')
    .select('*')
    .eq('game_id', game.id)

  const winner = checkVictory(updatedPlayers || [])

  if (winner) {
    await client.from('games').update({
      status: 'finished',
      winner,
      phase_end_at: null,
      hunter_target_pending: null
    }).eq('id', game.id)

    await createGameEvent(client, game.id, 'game_end', getVictoryMessage(winner), { winner })

    return { advanced: true, from: 'hunter', to: 'finished', winner }
  }

  // Transition to night
  const phaseEndAt = getPhaseEndTime(settings, 'night')

  await client.from('games').update({
    status: 'night',
    day_number: game.day_number + 1,
    phase_end_at: phaseEndAt.toISOString(),
    hunter_target_pending: null
  }).eq('id', game.id)

  await createGameEvent(
    client,
    game.id,
    'night_start',
    `Nuit ${game.day_number + 1} - Le village s'endort après cette journée tragique.`,
    { day_number: game.day_number + 1 }
  )

  return { advanced: true, from: 'hunter', to: 'night' }
}
