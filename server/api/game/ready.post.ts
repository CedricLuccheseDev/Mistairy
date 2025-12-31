/**
 * Ready API - Mark player as ready during day phase
 * Thin handler - business logic in game/lobby.ts
 */

import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { setPlayerReady } from '../../game'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, playerId } = body

  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: 'Paramètres manquants' })
  }

  const client = await serverSupabaseClient<Database>(event)

  // Get player
  const { data: player } = await client
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

  if (!player) {
    throw createError({ statusCode: 403, message: 'Joueur non trouvé' })
  }

  // Get game
  const { data: game } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (!game) {
    throw createError({ statusCode: 404, message: 'Partie introuvable' })
  }

  const result = await setPlayerReady(client, game, player)

  if (!result.success) {
    throw createError({ statusCode: 400, message: result.error })
  }

  return { success: true, alreadyReady: result.alreadyReady }
})
