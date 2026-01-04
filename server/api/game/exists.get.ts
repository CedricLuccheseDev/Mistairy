/**
 * Check if Game Exists API
 * Verifies if a game code is valid before navigation
 */

import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string

  if (!code || typeof code !== 'string' || code.trim().length !== 6) {
    throw createError({ statusCode: 400, message: 'Code invalide' })
  }

  const client = await serverSupabaseClient<Database>(event)

  const { data: game } = await client
    .from('games')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) {
    return { exists: false }
  }

  return {
    exists: true,
    status: game.status
  }
})
