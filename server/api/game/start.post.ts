import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { calculateRoles, shuffleArray } from '../../game'
import { logger } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, playerId } = body

  logger.info('GAME', `Start request: gameId=${gameId}, playerId=${playerId}`)

  if (!gameId || !playerId) {
    logger.error('GAME', 'Missing parameters for game start')
    throw createError({
      statusCode: 400,
      message: 'Paramètres manquants'
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  // Get game
  const { data: game, error: gameError } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError) {
    logger.error('GAME', `Failed to fetch game: ${gameError.message}`, gameError)
    throw createError({
      statusCode: 404,
      message: 'Partie introuvable'
    })
  }

  if (!game) {
    logger.error('GAME', `Game not found: ${gameId}`)
    throw createError({
      statusCode: 404,
      message: 'Partie introuvable'
    })
  }

  logger.info('GAME', `Found game ${game.code}, status: ${game.status}`)

  // Verify the player is the host
  const { data: player, error: playerError } = await client
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('game_id', gameId)
    .single()

  if (playerError) {
    logger.error('GAME', `Failed to fetch player: ${playerError.message}`, playerError)
  }

  if (!player) {
    logger.error('GAME', `Player ${playerId} not found in game ${gameId}`)
    throw createError({
      statusCode: 403,
      message: 'Joueur non trouvé dans cette partie'
    })
  }

  logger.info('GAME', `Player ${player.name}, is_host: ${player.is_host}, game.host_id: ${game.host_id}`)

  if (game.host_id !== playerId && !player.is_host) {
    logger.error('GAME', `Player ${player.name} is not host`)
    throw createError({
      statusCode: 403,
      message: 'Seul l\'hôte peut lancer la partie'
    })
  }

  // Update host_id if inconsistent but player is_host
  if (game.host_id !== playerId && player.is_host) {
    logger.warn('GAME', `Fixing inconsistent host_id for game ${game.code}`)
    await client.from('games').update({ host_id: playerId }).eq('id', gameId)
  }

  if (game.status !== 'lobby') {
    logger.warn('GAME', `Game ${game.code} already started (status: ${game.status})`)
    throw createError({
      statusCode: 400,
      message: 'La partie a déjà commencé'
    })
  }

  // Get all players
  const { data: players, error: playersError } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)

  if (playersError) {
    logger.error('GAME', `Failed to fetch players: ${playersError.message}`, playersError)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération des joueurs'
    })
  }

  if (!players || players.length < 5) {
    logger.error('GAME', `Not enough players: ${players?.length || 0}`)
    throw createError({
      statusCode: 400,
      message: 'Il faut au moins 5 joueurs'
    })
  }

  logger.info('GAME', `Starting game ${game.code} with ${players.length} players`)

  // Distribute roles
  const roles = shuffleArray(calculateRoles(players.length))
  logger.info('GAME', `Roles distributed: ${roles.join(', ')}`)

  const updatePromises = players.map((p, index) =>
    client
      .from('players')
      .update({ role: roles[index] })
      .eq('id', p.id)
  )

  await Promise.all(updatePromises)
  logger.success('GAME', `Roles assigned to all players`)

  // Start with intro phase (narration phase without timer)
  const { error: updateError } = await client.from('games').update({
    status: 'intro',
    day_number: 1,
    phase_end_at: null
  }).eq('id', gameId)

  if (updateError) {
    logger.error('GAME', `Failed to update game status to intro: ${updateError.message}`, updateError)
    logger.error('GAME', `This might be a database constraint issue - run the migration: 002_add_intro_status.sql`)
    throw createError({
      statusCode: 500,
      message: `Erreur DB: ${updateError.message}. Exécutez la migration 002_add_intro_status.sql`
    })
  }

  // Create game start event
  const { error: eventError } = await client.from('game_events').insert({
    game_id: gameId,
    event_type: 'game_start',
    message: 'La partie commence. La nuit tombe sur le village...',
    data: { player_count: players.length }
  })

  if (eventError) {
    logger.error('GAME', `Failed to create game_start event: ${eventError.message}`, eventError)
  }

  logger.game.start(game.code, players.length)

  return { success: true }
})
