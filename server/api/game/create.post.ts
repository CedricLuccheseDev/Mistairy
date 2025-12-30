import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { DEFAULT_SETTINGS } from '../../../shared/config/game.config'
import { logger } from '../../utils/logger'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default defineEventHandler(async (event) => {
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
      status: 'lobby',
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
    })
    .select()
    .single()

  if (gameError || !game) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la création de la partie'
    })
  }

  logger.game.create(game.code)

  return {
    code: game.code,
    gameId: game.id
  }
})
