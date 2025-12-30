import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../shared/types/database.types'
import { ROLE_ACTIONS } from '../../../shared/config/game.config'
import { transitionToDay } from '../../game'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, playerId, actionType, targetId } = body

  if (!gameId || !playerId || !actionType) {
    throw createError({
      statusCode: 400,
      message: 'Paramètres manquants'
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  const { data: player } = await client
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

  if (!player) {
    throw createError({
      statusCode: 403,
      message: 'Joueur non trouvé'
    })
  }

  const { data: game } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (!game || game.status !== 'night') {
    throw createError({
      statusCode: 400,
      message: 'Action non autorisée en dehors de la nuit'
    })
  }

  if (!player.is_alive) {
    throw createError({
      statusCode: 400,
      message: 'Les morts ne peuvent pas agir'
    })
  }

  // Vérifier que l'action est valide pour ce rôle
  if (!player.role || !ROLE_ACTIONS[player.role]?.includes(actionType)) {
    throw createError({
      statusCode: 400,
      message: 'Action non autorisée pour ce rôle'
    })
  }

  // Vérifier si l'action a déjà été faite
  const { data: existingAction } = await client
    .from('night_actions')
    .select('id')
    .eq('game_id', gameId)
    .eq('day_number', game.day_number)
    .eq('player_id', playerId)
    .eq('action_type', actionType)
    .single()

  if (existingAction) {
    throw createError({
      statusCode: 400,
      message: 'Action déjà effectuée'
    })
  }

  // Vérifier les potions de la sorcière
  if (actionType === 'witch_heal' && player.witch_heal_used) {
    throw createError({
      statusCode: 400,
      message: 'Potion de vie déjà utilisée'
    })
  }

  if (actionType === 'witch_kill' && player.witch_kill_used) {
    throw createError({
      statusCode: 400,
      message: 'Potion de mort déjà utilisée'
    })
  }

  // Skip de la sorcière (ne fait rien mais compte comme action)
  if (actionType === 'witch_skip') {
    return { success: true }
  }

  // Enregistrer l'action
  await client.from('night_actions').insert({
    game_id: gameId,
    day_number: game.day_number,
    player_id: playerId,
    action_type: actionType,
    target_id: targetId
  })

  // Marquer les potions comme utilisées
  if (actionType === 'witch_heal') {
    await client.from('players').update({ witch_heal_used: true }).eq('id', playerId)
  }

  if (actionType === 'witch_kill') {
    await client.from('players').update({ witch_kill_used: true }).eq('id', playerId)
  }

  // Pour la voyante, révéler le rôle
  let revealedRole = null
  if (actionType === 'seer_look' && targetId) {
    const { data: target } = await client
      .from('players')
      .select('role')
      .eq('id', targetId)
      .single()

    revealedRole = target?.role || null
  }

  // Vérifier si la nuit est terminée
  await checkAndResolveNight(client, game)

  return { success: true, revealedRole }
})

async function checkAndResolveNight(
  client: Awaited<ReturnType<typeof serverSupabaseClient<Database>>>,
  game: Database['public']['Tables']['games']['Row']
) {
  const { data: players } = await client
    .from('players')
    .select('*')
    .eq('game_id', game.id)

  if (!players) return

  const alivePlayers = players.filter(p => p.is_alive)
  const werewolves = alivePlayers.filter(p => p.role === 'werewolf')
  const seer = alivePlayers.find(p => p.role === 'seer')

  const { data: actions } = await client
    .from('night_actions')
    .select('*')
    .eq('game_id', game.id)
    .eq('day_number', game.day_number)

  if (!actions) return

  // Tous les loups ont voté ?
  const werewolfVotes = actions.filter(a => a.action_type === 'werewolf_vote')
  const allWolvesVoted = werewolves.every(w =>
    werewolfVotes.some(v => v.player_id === w.id)
  )

  // La voyante a agi ?
  const seerActed = !seer || actions.some(a => a.action_type === 'seer_look')

  // Si tout le monde a agi, passer au jour
  if (allWolvesVoted && seerActed) {
    await transitionToDay(client, game, players)
  }
}
