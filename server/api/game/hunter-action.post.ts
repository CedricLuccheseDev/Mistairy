import { getServiceClient } from '../../utils/supabase'
import type { Database, GameSettings } from '../../../shared/types/database.types'
import { checkVictory, getVictoryMessage } from '../../game/victory'
import { getPhaseEndTime, getDefaultSettings } from '../../game/phases'

type Player = Database['public']['Tables']['players']['Row']

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, playerId, targetId } = body

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Paramètres manquants'
    })
  }

  const client = getServiceClient()

  // Get game
  const { data: game, error: gameError } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    throw createError({
      statusCode: 404,
      message: 'Partie introuvable'
    })
  }

  // Verify it's hunter phase and this player is the hunter who needs to shoot
  if (game.status !== 'hunter') {
    throw createError({
      statusCode: 400,
      message: 'Ce n\'est pas la phase du chasseur'
    })
  }

  if (game.hunter_target_pending !== playerId) {
    throw createError({
      statusCode: 403,
      message: 'Ce n\'est pas votre tour de tirer'
    })
  }

  // Get all players
  const { data: players } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)

  if (!players) {
    throw createError({
      statusCode: 500,
      message: 'Impossible de récupérer les joueurs'
    })
  }

  // If hunter chose a target, kill them
  let hunterVictim: Player | null = null
  if (targetId) {
    const target = players.find(p => p.id === targetId && p.is_alive)
    if (!target) {
      throw createError({
        statusCode: 400,
        message: 'Cible invalide'
      })
    }

    hunterVictim = target

    // Kill the target
    await client
      .from('players')
      .update({ is_alive: false })
      .eq('id', targetId)

    // Record the action
    await client.from('night_actions').insert({
      game_id: gameId,
      day_number: game.day_number,
      player_id: playerId,
      action_type: 'hunter_kill',
      target_id: targetId
    })

    // Create event
    await client.from('game_events').insert({
      game_id: gameId,
      event_type: 'hunter_kill',
      message: `Le chasseur a tiré sur ${target.name} dans son dernier souffle !`,
      data: { hunterId: playerId, targetId, targetName: target.name, targetRole: target.role }
    })

    // Check if hunter killed another hunter (chain reaction)
    if (target.role === 'hunter') {
      // Another hunter died - they need to shoot too
      await client.from('games').update({
        hunter_target_pending: targetId
      }).eq('id', gameId)

      await client.from('game_events').insert({
        game_id: gameId,
        event_type: 'hunter_death',
        message: `${target.name} était aussi chasseur ! Il peut emporter quelqu'un avec lui.`,
        data: { hunterId: targetId }
      })

      return {
        success: true,
        killed: target.name,
        chainReaction: true
      }
    }
  }
  else {
    // Hunter chose not to shoot
    await client.from('game_events').insert({
      game_id: gameId,
      event_type: 'hunter_skip',
      message: 'Le chasseur a choisi de ne pas tirer.',
      data: { hunterId: playerId }
    })
  }

  // Check victory condition
  const { data: updatedPlayers } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)

  const winner = checkVictory(updatedPlayers || [])

  if (winner) {
    await client.from('games').update({
      status: 'finished',
      winner,
      phase_end_at: null,
      hunter_target_pending: null
    }).eq('id', gameId)

    await client.from('game_events').insert({
      game_id: gameId,
      event_type: 'game_end',
      message: getVictoryMessage(winner),
      data: { winner }
    })

    return {
      success: true,
      killed: hunterVictim?.name || null,
      gameOver: true,
      winner
    }
  }

  // Determine next phase based on what triggered hunter death
  // We need to store this context - for now, transition to night
  const settings = (game.settings as unknown as GameSettings) || getDefaultSettings()
  const phaseEndAt = getPhaseEndTime(settings, 'night')

  await client.from('games').update({
    status: 'night',
    day_number: game.day_number + 1,
    phase_end_at: phaseEndAt.toISOString(),
    hunter_target_pending: null
  }).eq('id', gameId)

  await client.from('game_events').insert({
    game_id: gameId,
    event_type: 'night_start',
    message: `Nuit ${game.day_number + 1} - Le village s'endort après cette journée tragique.`,
    data: {}
  })

  return {
    success: true,
    killed: hunterVictim?.name || null,
    nextPhase: 'night'
  }
})
