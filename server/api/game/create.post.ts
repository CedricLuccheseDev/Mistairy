import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { playerName } = body

  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Le nom du joueur est requis'
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  let code = generateCode()
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const { data: existing } = await client
      .from('games')
      .select('id')
      .eq('code', code)
      .single()

    if (!existing) break

    code = generateCode()
    attempts++
  }

  if (attempts >= maxAttempts) {
    throw createError({
      statusCode: 500,
      message: 'Impossible de générer un code unique'
    })
  }

  const { data: game, error: gameError } = await client
    .from('games')
    .insert({
      code,
      status: 'lobby'
    })
    .select()
    .single()

  if (gameError || !game) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la création de la partie'
    })
  }

  const { data: player, error: playerError } = await client
    .from('players')
    .insert({
      game_id: game.id,
      name: playerName.trim(),
      is_host: true
    })
    .select()
    .single()

  if (playerError || !player) {
    await client.from('games').delete().eq('id', game.id)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la création du joueur'
    })
  }

  await client
    .from('games')
    .update({ host_id: player.id })
    .eq('id', game.id)

  return {
    code: game.code,
    gameId: game.id,
    playerId: player.id
  }
})
