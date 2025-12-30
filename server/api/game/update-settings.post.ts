import { serverSupabaseClient } from '#supabase/server'
import type { Database, GameSettings } from '../../../shared/types/database.types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, settings } = body as { gameId: string; settings: GameSettings }

  if (!gameId || !settings) {
    throw createError({
      statusCode: 400,
      message: 'gameId et settings sont requis'
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  // Get game and verify it's in lobby
  const { data: game, error: gameError } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    throw createError({
      statusCode: 404,
      message: 'Partie non trouvée'
    })
  }

  if (game.status !== 'lobby') {
    throw createError({
      statusCode: 400,
      message: 'La partie a déjà commencé'
    })
  }

  // Update settings
  const { error: updateError } = await client
    .from('games')
    .update({ settings: JSON.parse(JSON.stringify(settings)) })
    .eq('id', gameId)

  if (updateError) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la mise à jour des paramètres'
    })
  }

  return { success: true }
})
