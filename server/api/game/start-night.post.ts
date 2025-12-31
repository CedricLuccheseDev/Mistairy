/**
 * Start Night API - Transition from intro to night phase
 * Thin handler - business logic in game/lobby.ts
 */

import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { startNight } from '../../game'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId } = body

  if (!gameId) {
    throw createError({ statusCode: 400, message: 'gameId requis' })
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

  const result = await startNight(client, game)

  if (!result.success) {
    throw createError({ statusCode: 400, message: result.error })
  }

  return { success: true, alreadyStarted: result.alreadyStarted }
})
