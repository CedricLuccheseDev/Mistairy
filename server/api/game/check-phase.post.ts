/**
 * Check Phase API - Timer-based phase transitions
 * Called periodically to check if phase timer expired
 */

import { getServiceClient } from '../../utils/supabase'
import type { Database, GameSettings } from '../../../shared/types/database.types'
import type { Player } from '../../game/types'
import * as engine from '../../game/engine'
import * as db from '../../services/database'
import { checkAndResolveVotes } from '../../game/actions'

type Game = Database['public']['Tables']['games']['Row']

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const geminiApiKey = config.geminiApiKey as string | undefined
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

  try {
    switch (game.status) {
      case 'night':
        return await handleNightEnd(client, game, players, geminiApiKey)

      case 'day':
        return await handleDayEnd(client, game, geminiApiKey)

      case 'vote':
        return await handleVoteEnd(client, game, players, geminiApiKey)

      case 'vote_result':
        return await handleVoteResultEnd(client, game, geminiApiKey)

      case 'hunter':
        return await handleHunterTimeout(client, game, geminiApiKey)

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
  players: Player[],
  geminiApiKey?: string
) {
  const settings = (game.settings as unknown as GameSettings) || engine.getDefaultSettings()

  // Timer expired - advance to next night role (not directly to day_intro)
  // If current role didn't act in time, they lose their turn
  const result = await engine.advanceToNextNightRole(client, game, players, settings, geminiApiKey)

  if (result.transitionedToDay) {
    // All night roles done, now in day_intro phase (narration)
    const updated = await db.getPlayers(client, game.id)
    const winner = engine.checkVictory(updated)
    return {
      advanced: true,
      from: 'night',
      to: winner ? 'finished' : 'day_intro',
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
  game: Game,
  geminiApiKey?: string
) {
  await engine.transitionToVote(client, game, geminiApiKey)
  return { advanced: true, from: 'day', to: 'vote' }
}

async function handleVoteEnd(
  client: ReturnType<typeof getServiceClient>,
  game: Game,
  _players: Player[],
  geminiApiKey?: string
) {
  // Use shared vote resolution logic from actions.ts
  const result = await checkAndResolveVotes(client, game, geminiApiKey)

  return {
    advanced: true,
    from: 'vote',
    to: 'vote_result',
    eliminated: result?.eliminated || null
  }
}

async function handleVoteResultEnd(
  client: ReturnType<typeof getServiceClient>,
  game: Game,
  geminiApiKey?: string
) {
  // Transition from vote_result to night_intro (or hunter if applicable)
  const result = await engine.transitionFromVoteResult(client, game, geminiApiKey)
  return {
    advanced: true,
    from: 'vote_result',
    to: result.nextPhase,
    winner: result.winner
  }
}

async function handleHunterTimeout(
  client: ReturnType<typeof getServiceClient>,
  game: Game,
  geminiApiKey?: string
) {
  if (game.hunter_target_pending) {
    await db.createGameEvent(client, game.id, 'hunter_timeout',
      'Le chasseur n\'a pas tiré à temps.', { hunterId: game.hunter_target_pending })
  }

  // Check victory
  const players = await db.getPlayers(client, game.id)
  const winner = engine.checkVictory(players)

  if (winner) {
    await engine.endGame(client, game.id, winner, undefined, geminiApiKey)
    return { advanced: true, from: 'hunter', to: 'finished', winner }
  }

  // Transition based on where hunter died (night → day_intro, vote → night_intro)
  const result = await engine.transitionAfterHunter(client, game, undefined, geminiApiKey)

  return { advanced: true, from: 'hunter', to: result.nextPhase, winner: result.winner }
}
