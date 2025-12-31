import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { getPhaseEndTime, getDefaultSettings } from '../../game'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, playerId } = body

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Paramètres manquants'
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  // Verify player exists and is alive
  const { data: player } = await client
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

  if (!player || !player.is_alive) {
    throw createError({
      statusCode: 403,
      message: 'Joueur non trouvé ou éliminé'
    })
  }

  // Verify game is in day phase
  const { data: game } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (!game || game.status !== 'day') {
    throw createError({
      statusCode: 400,
      message: 'Pas en phase jour'
    })
  }

  // Check if already ready
  const { data: existingReady } = await client
    .from('day_ready')
    .select('id')
    .eq('game_id', gameId)
    .eq('day_number', game.day_number)
    .eq('player_id', playerId)
    .single()

  if (existingReady) {
    return { success: true, alreadyReady: true }
  }

  // Mark as ready
  await client.from('day_ready').insert({
    game_id: gameId,
    day_number: game.day_number,
    player_id: playerId
  })

  // Check if all alive players are ready
  const { data: alivePlayers } = await client
    .from('players')
    .select('id')
    .eq('game_id', gameId)
    .eq('is_alive', true)

  const { data: readyPlayers } = await client
    .from('day_ready')
    .select('player_id')
    .eq('game_id', gameId)
    .eq('day_number', game.day_number)

  if (alivePlayers && readyPlayers && readyPlayers.length >= alivePlayers.length) {
    // All players ready - transition to vote phase
    const settings = (game.settings as unknown as ReturnType<typeof getDefaultSettings>) || getDefaultSettings()
    const phaseEndAt = getPhaseEndTime(settings, 'vote')

    await client.from('games').update({
      status: 'vote',
      phase_end_at: phaseEndAt.toISOString()
    }).eq('id', gameId)

    await client.from('game_events').insert({
      game_id: gameId,
      event_type: 'vote_start',
      message: 'Le village est prêt à voter.',
      data: { day_number: game.day_number }
    })
  }

  return { success: true }
})
