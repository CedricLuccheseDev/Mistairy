import { serverSupabaseClient } from '#supabase/server'
import type { Database, GameSettings } from '../../../shared/types/database.types'
import { DEFAULT_SETTINGS } from '../../../shared/config/game.config'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { playerName, code } = body

  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Le nom du joueur est requis'
    })
  }

  if (!code || typeof code !== 'string' || code.trim().length !== 6) {
    throw createError({
      statusCode: 400,
      message: 'Code de partie invalide'
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  const { data: game, error: gameError } = await client
    .from('games')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (gameError || !game) {
    throw createError({
      statusCode: 404,
      message: 'Partie introuvable'
    })
  }

  if (game.status !== 'lobby') {
    throw createError({
      statusCode: 400,
      message: 'La partie a déjà commencé'
    })
  }

  const { data: existingPlayers } = await client
    .from('players')
    .select('id')
    .eq('game_id', game.id)

  // Get max_players from game settings, fallback to global MAX_PLAYERS
  const settings = game.settings as GameSettings | null
  const maxPlayers = settings?.max_players ?? DEFAULT_SETTINGS.max_players

  if (existingPlayers && existingPlayers.length >= maxPlayers) {
    throw createError({
      statusCode: 400,
      message: `La partie est complète (${maxPlayers} joueurs max)`
    })
  }

  // First player becomes host
  const isFirstPlayer = !existingPlayers || existingPlayers.length === 0

  const { data: player, error: playerError } = await client
    .from('players')
    .insert({
      game_id: game.id,
      name: playerName.trim(),
      is_host: isFirstPlayer
    })
    .select()
    .single()

  if (playerError || !player) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la connexion à la partie'
    })
  }

  // Set host_id on game if first player
  if (isFirstPlayer) {
    await client
      .from('games')
      .update({ host_id: player.id })
      .eq('id', game.id)
  }

  logger.player.join(game.code, player.name, isFirstPlayer)

  return {
    code: game.code,
    gameId: game.id,
    playerId: player.id,
    isHost: isFirstPlayer
  }
})
