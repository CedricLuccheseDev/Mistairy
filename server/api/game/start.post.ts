import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { calculateRoles, shuffleArray, getPhaseEndTime, getDefaultSettings } from '../../game'

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

  const { data: game, error: gameError } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    throw createError({
      statusCode: 404,
      message: 'Partie introuvable'
    })
  }

  if (game.host_id !== playerId) {
    throw createError({
      statusCode: 403,
      message: 'Seul l\'hôte peut lancer la partie'
    })
  }

  if (game.status !== 'lobby') {
    throw createError({
      statusCode: 400,
      message: 'La partie a déjà commencé'
    })
  }

  const { data: players } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)

  if (!players || players.length < 5) {
    throw createError({
      statusCode: 400,
      message: 'Il faut au moins 5 joueurs'
    })
  }

  // Distribuer les rôles
  const roles = shuffleArray(calculateRoles(players.length))

  const updatePromises = players.map((player, index) =>
    client
      .from('players')
      .update({ role: roles[index] })
      .eq('id', player.id)
  )

  await Promise.all(updatePromises)

  // Démarrer la première nuit
  const settings = (game.settings as ReturnType<typeof getDefaultSettings>) || getDefaultSettings()
  const phaseEndAt = getPhaseEndTime(settings, 'night')

  await client.from('games').update({
    status: 'night',
    day_number: 1,
    phase_end_at: phaseEndAt.toISOString()
  }).eq('id', gameId)

  await client.from('game_events').insert({
    game_id: gameId,
    event_type: 'game_start',
    message: 'La partie commence. La nuit tombe sur le village...',
    data: { player_count: players.length }
  })

  return { success: true }
})
