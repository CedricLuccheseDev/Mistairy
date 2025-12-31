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

  // If player is the host, first clear host_id to avoid FK constraint violation
  if (player.is_host) {
    await client
      .from('games')
      .update({ host_id: null })
      .eq('id', gameId)
  }

  // Delete the player
  const { error: deleteError } = await client
    .from('players')
    .delete()
    .eq('id', playerId)

  if (deleteError) {
    throw createError({ statusCode: 500, message: 'Failed to delete player' })
  }

  // Check remaining players
  const { data: remainingPlayers } = await client
    .from('players')
    .select('id')
    .eq('game_id', gameId)

  // If no players left, delete the game
  if (!remainingPlayers || remainingPlayers.length === 0) {
    await client
      .from('games')
      .delete()
      .eq('id', gameId)

    return { success: true, gameDeleted: true }
  }

  // If the host left, assign host to a random remaining player
  if (player.is_host && remainingPlayers.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingPlayers.length)
    const newHostId = remainingPlayers[randomIndex]!.id

    await client
      .from('players')
      .update({ is_host: true })
      .eq('id', newHostId)

    await client
      .from('games')
      .update({ host_id: newHostId })
      .eq('id', gameId)
  }

  return { success: true, gameDeleted: false }
})
