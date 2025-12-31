/**
 * Leave Game API
 * Thin handler - business logic in game/lobby.ts
 */

import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/types/database.types'
import { leaveGame } from '../../game'

export default defineEventHandler(async (event) => {
  // Handle both JSON and sendBeacon (text/plain) requests
  let body = await readBody(event)
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    }
    catch {
      throw createError({ statusCode: 400, message: 'Invalid body' })
    }
  }

  const { playerId, gameId } = body

  if (!playerId || !gameId) {
    throw createError({ statusCode: 400, message: 'playerId and gameId required' })
  }

  const client = serverSupabaseServiceRole<Database>(event)

  const result = await leaveGame(client, gameId, playerId)

  if (!result.success) {
    const statusCode = result.error?.includes('introuvable') ? 404 : 400
    throw createError({ statusCode, message: result.error })
  }

  return { success: true, gameDeleted: result.gameDeleted }
})
