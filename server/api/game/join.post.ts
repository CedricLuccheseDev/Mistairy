import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

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

  if (existingPlayers && existingPlayers.length >= 18) {
    throw createError({
      statusCode: 400,
      message: 'La partie est complète (18 joueurs max)'
    })
  }

  const { data: player, error: playerError } = await client
    .from('players')
    .insert({
      game_id: game.id,
      name: playerName.trim(),
      is_host: false
    })
    .select()
    .single()

  if (playerError || !player) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la connexion à la partie'
    })
  }

  return {
    code: game.code,
    gameId: game.id,
    playerId: player.id
  }
})
