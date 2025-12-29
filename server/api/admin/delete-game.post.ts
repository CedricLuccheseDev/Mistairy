import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId } = body

  if (!gameId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID requis'
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  // Delete in order due to foreign keys
  const { error: votesError } = await client
    .from('day_votes')
    .delete()
    .eq('game_id', gameId)

  if (votesError) {
    console.error('Error deleting votes:', votesError)
  }

  const { error: actionsError } = await client
    .from('night_actions')
    .delete()
    .eq('game_id', gameId)

  if (actionsError) {
    console.error('Error deleting night actions:', actionsError)
  }

  const { error: eventsError } = await client
    .from('game_events')
    .delete()
    .eq('game_id', gameId)

  if (eventsError) {
    console.error('Error deleting events:', eventsError)
  }

  // Remove host_id reference before deleting players
  const { error: updateError } = await client
    .from('games')
    .update({ host_id: null })
    .eq('id', gameId)

  if (updateError) {
    console.error('Error updating game host:', updateError)
  }

  const { error: playersError } = await client
    .from('players')
    .delete()
    .eq('game_id', gameId)

  if (playersError) {
    console.error('Error deleting players:', playersError)
  }

  const { error: gameError } = await client
    .from('games')
    .delete()
    .eq('id', gameId)

  if (gameError) {
    console.error('Error deleting game:', gameError)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la suppression de la partie'
    })
  }

  return { success: true }
})
