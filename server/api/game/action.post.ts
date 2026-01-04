/**
 * Unified Action API - All player actions
 * vote, night actions (werewolf, seer, witch), hunter
 */

import { getServiceClient } from '../../utils/supabase'
import { submitVote, submitNightAction, submitHunterAction } from '../../game'
import { logger } from '../../utils/logger'
import type { NightActionType } from '../../../shared/types/game'

// Action types (vote + all night actions including hunter)
type ActionType = 'vote' | NightActionType

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const geminiApiKey = config.geminiApiKey as string | undefined
  const body = await readBody(event)
  const { gameId, playerId, actionType, targetId } = body as {
    gameId: string
    playerId: string
    actionType: ActionType
    targetId?: string
  }

  if (!gameId || !playerId || !actionType) {
    throw createError({ statusCode: 400, message: 'Paramètres manquants' })
  }

  const client = getServiceClient()

  // Get player
  const { data: player, error: playerError } = await client
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

  if (playerError || !player) {
    throw createError({ statusCode: 403, message: 'Joueur non trouvé' })
  }

  // Get game
  const { data: game, error: gameError } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    throw createError({ statusCode: 404, message: 'Partie non trouvée' })
  }

  // Route to appropriate handler
  let result

  switch (actionType) {
    case 'vote':
      if (!targetId) {
        throw createError({ statusCode: 400, message: 'targetId requis pour le vote' })
      }
      result = await submitVote(client, game, player, targetId, geminiApiKey)
      if (result.success) {
        logger.vote.cast(game.code, player.name, targetId)
      }
      break

    case 'hunter_kill':
      if (!targetId) {
        throw createError({ statusCode: 400, message: 'targetId requis pour le chasseur' })
      }
      result = await submitHunterAction(client, game, player, targetId, geminiApiKey)
      if (result.success) {
        logger.night.action(game.code, player.name, 'hunter_kill', result.data?.targetName as string)
      }
      break

    case 'hunter_skip':
      // Hunter chooses not to shoot - just mark action as done
      result = await submitNightAction(client, game, player, 'hunter_skip', null, geminiApiKey)
      if (result.success) {
        logger.night.action(game.code, player.name, 'hunter_skip', 'none')
      }
      break

    default:
      // Night actions: werewolf_kill, seer_view, witch_save, witch_kill, witch_skip
      result = await submitNightAction(client, game, player, actionType, targetId || null, geminiApiKey)
      if (result.success) {
        logger.night.action(game.code, player.name, actionType, targetId || 'none')
      }
  }

  if (!result.success) {
    throw createError({ statusCode: 400, message: result.error })
  }

  return { success: true, ...result.data }
})
