/**
 * Start Day API - Transition from day_intro to day phase
 * Called after day narration is complete
 */

import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { startDayDebate } from '../../game'

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

  if (game.status !== 'day_intro') {
    return { success: true, alreadyStarted: true }
  }

  const result = await startDayDebate(client, game)

  return { success: result.success, nextPhase: result.nextPhase }
})
