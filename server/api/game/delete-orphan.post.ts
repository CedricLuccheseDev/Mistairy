import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/types/database.types'

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
  const { gameId } = body

  if (!gameId) {
    throw createError({ statusCode: 400, message: 'gameId required' })
  }

  const client = serverSupabaseServiceRole<Database>(event)

  // Get game info
  const { data: game } = await client
    .from('games')
    .select('status')
    .eq('id', gameId)
    .single()

  if (!game) {
    // Game already deleted, that's fine
    return { success: true, alreadyDeleted: true }
  }

  // Only delete if still in lobby
  if (game.status !== 'lobby') {
    return { success: false, message: 'Game already started' }
  }

  // Check if there are any players
  const { data: players } = await client
    .from('players')
    .select('id')
    .eq('game_id', gameId)

  // Only delete if no players have joined
  if (players && players.length > 0) {
    return { success: false, message: 'Game has players' }
  }

  // Delete the orphan game
  await client
    .from('games')
    .delete()
    .eq('id', gameId)

  return { success: true }
})
