/**
 * Join Game API
 * Thin handler - business logic in game/lobby.ts
 */

import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { joinGame } from '../../game'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { playerName, code } = body

  // Input validation only
  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'Le nom du joueur est requis' })
  }

  if (!code || typeof code !== 'string' || code.trim().length !== 6) {
    throw createError({ statusCode: 400, message: 'Code de partie invalide' })
  }

  const client = await serverSupabaseClient<Database>(event)

  const result = await joinGame(client, code, playerName)

  if (!result.success) {
    const statusCode = result.error === 'Partie introuvable' ? 404 : 400
    throw createError({ statusCode, message: result.error })
  }

  logger.player.join(result.code!, playerName, result.isHost!)

  return {
    code: result.code,
    gameId: result.gameId,
    playerId: result.playerId,
    isHost: result.isHost
  }
})
