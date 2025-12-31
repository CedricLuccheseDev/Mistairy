/**
 * Start Game API
 * Thin handler - business logic in game/lobby.ts
 */

import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { startGame } from '../../game'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, playerId } = body

  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: 'Paramètres manquants' })
  }

  const client = await serverSupabaseClient<Database>(event)

  // Get game
  const { data: game, error: gameError } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    throw createError({ statusCode: 404, message: 'Partie introuvable' })
  }

  // Get host player
  const { data: player, error: playerError } = await client
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('game_id', gameId)
    .single()

  if (playerError || !player) {
    throw createError({ statusCode: 403, message: 'Joueur non trouvé dans cette partie' })
  }

  // Get all players
  const { data: players, error: playersError } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)

  if (playersError || !players) {
    throw createError({ statusCode: 500, message: 'Erreur lors de la récupération des joueurs' })
  }

  const result = await startGame(client, game, player, players)

  if (!result.success) {
    throw createError({ statusCode: 400, message: result.error })
  }

  logger.game.start(game.code, players.length)

  return { success: true }
})
