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

  const { data: game } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (!game) {
    throw createError({
      statusCode: 404,
      message: 'Partie introuvable'
    })
  }

  // Seul l'hôte peut forcer le passage à la phase suivante
  if (game.host_id !== playerId) {
    throw createError({
      statusCode: 403,
      message: 'Seul l\'hôte peut avancer la phase'
    })
  }

  const settings = (game.settings as unknown as ReturnType<typeof getDefaultSettings>) || getDefaultSettings()

  // day -> vote
  if (game.status === 'day') {
    const phaseEndAt = getPhaseEndTime(settings, 'vote')

    await client.from('games').update({
      status: 'vote',
      phase_end_at: phaseEndAt.toISOString()
    }).eq('id', gameId)

    await client.from('game_events').insert({
      game_id: gameId,
      event_type: 'vote_start',
      message: 'Le temps du débat est terminé. Place au vote !',
      data: {}
    })

    return { success: true, newStatus: 'vote' }
  }

  throw createError({
    statusCode: 400,
    message: 'Transition non autorisée'
  })
})
