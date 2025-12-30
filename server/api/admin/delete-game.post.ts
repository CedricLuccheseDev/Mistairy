import { getServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId } = body

  if (!gameId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID requis'
    })
  }

  const client = getServiceClient()

  // First remove host_id to avoid circular reference
  await client
    .from('games')
    .update({ host_id: null })
    .eq('id', gameId)

  // Delete game - CASCADE will handle related records
  const { error } = await client
    .from('games')
    .delete()
    .eq('id', gameId)

  if (error) {
    console.error('Error deleting game:', error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la suppression de la partie'
    })
  }

  return { success: true }
})
