/**
 * Restart Game API
 * Resets a finished game back to lobby state
 */

import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { restartGame } from '../../game'
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

  const result = await restartGame(client, game, player)

  if (!result.success) {
    throw createError({ statusCode: 400, message: result.error })
  }

  logger.info('GAME', `${logger.code(game.code)} restarted`)

  return { success: true }
})
