import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { getPhaseEndTime, getDefaultSettings } from '../../game'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId } = body

  if (!gameId) {
    throw createError({
      statusCode: 400,
      message: 'gameId requis'
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

  // Only allow transition from intro phase
  if (game.status !== 'intro') {
    return { success: true, alreadyStarted: true }
  }

  // Start the actual night phase with timer
  const settings = (game.settings as unknown as ReturnType<typeof getDefaultSettings>) || getDefaultSettings()
  const phaseEndAt = getPhaseEndTime(settings, 'night')

  await client.from('games').update({
    status: 'night',
    phase_end_at: phaseEndAt.toISOString()
  }).eq('id', gameId)

  await client.from('game_events').insert({
    game_id: gameId,
    event_type: 'night_start',
    message: 'Nuit 1 - Les créatures de la nuit s\'éveillent...',
    data: { day_number: 1 }
  })

  return { success: true }
})
