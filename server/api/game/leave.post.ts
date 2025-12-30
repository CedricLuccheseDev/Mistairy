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
  const { playerId, gameId } = body

  if (!playerId || !gameId) {
    throw createError({ statusCode: 400, message: 'playerId and gameId required' })
  }

  const client = serverSupabaseServiceRole<Database>(event)

  // Get game status
  const { data: game } = await client
    .from('games')
    .select('status')
    .eq('id', gameId)
    .single()

  if (!game) {
    throw createError({ statusCode: 404, message: 'Game not found' })
  }

  // Only allow leaving during lobby
  if (game.status !== 'lobby') {
    throw createError({ statusCode: 400, message: 'Cannot leave game in progress' })
  }

  // Get player info before deleting
  const { data: player } = await client
    .from('players')
    .select('is_host')
    .eq('id', playerId)
    .eq('game_id', gameId)
    .single()

  if (!player) {
    throw createError({ statusCode: 404, message: 'Player not found' })
  }

  // Delete the player
  await client
    .from('players')
    .delete()
    .eq('id', playerId)

  // Check remaining players
  const { data: remainingPlayers } = await client
    .from('players')
    .select('id, created_at')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })

  // If no players left, delete the game
  if (!remainingPlayers || remainingPlayers.length === 0) {
    await client
      .from('games')
      .delete()
      .eq('id', gameId)

    return { success: true, gameDeleted: true }
  }

  // If the host left, assign host to the oldest remaining player
  if (player.is_host && remainingPlayers.length > 0) {
    await client
      .from('players')
      .update({ is_host: true })
      .eq('id', remainingPlayers[0]!.id)
  }

  return { success: true, gameDeleted: false }
})
