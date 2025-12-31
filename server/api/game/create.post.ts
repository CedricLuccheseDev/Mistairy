/**
 * Create Game API
 * Thin handler - business logic in game/lobby.ts
 */

import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { createGame } from '../../game'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  const result = await createGame(client)

  if (!result.success) {
    throw createError({ statusCode: 500, message: result.error })
  }

  logger.game.create(result.code!)

  return { code: result.code, gameId: result.gameId }
})
