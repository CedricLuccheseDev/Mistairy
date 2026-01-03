/**
 * Game Actions - All player action handlers
 * Vote, night actions, hunter actions
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, GameSettings } from '../../shared/types/database.types'
import type { Game, Player } from './types'
import type { NightActionType } from '../../shared/types/game'
import { isValidActionForRole } from '../../shared/config/roles.config'
import * as db from '../services/database'
import * as engine from './engine'

/* ═══════════════════════════════════════════
   VALIDATION HELPERS
   ═══════════════════════════════════════════ */

export interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

function fail(error: string): ActionResult {
  return { success: false, error }
}

function ok(data?: Record<string, unknown>): ActionResult {
  return { success: true, data }
}

async function advanceNightRoleIfNeeded(
  client: SupabaseClient<Database>,
  game: Game,
  players: Player[],
  actionType: NightActionType
): Promise<{ advanced: boolean; nightComplete: boolean }> {
  const actions = await db.getNightActions(client, game.id, game.day_number)
  const alive = players.filter(p => p.is_alive)
  const settings = (game.settings as unknown as GameSettings) || engine.getDefaultSettings()

  let roleFinished = false

  // Check if current role group has finished
  if (actionType === 'werewolf_kill' || actionType === 'werewolf_skip') {
    const wolves = alive.filter(p => p.role === 'werewolf')
    const wolfActions = actions.filter(a => ['werewolf_kill', 'werewolf_skip'].includes(a.action_type))
    roleFinished = wolfActions.length >= wolves.length
  }
  else if (actionType === 'seer_view' || actionType === 'seer_skip') {
    roleFinished = true
  }
  else if (['witch_save', 'witch_kill', 'witch_skip'].includes(actionType)) {
    roleFinished = true
  }

  if (!roleFinished) {
    return { advanced: false, nightComplete: false }
  }

  // Check if night is complete
  const nightComplete = await engine.hasNightEnded(client, game.id, game.day_number, players)

  if (nightComplete) {
    await engine.transitionToDay(client, game, players)
    return { advanced: true, nightComplete: true }
  }

  // Advance to next role
  const nextRole = engine.getNextNightRole(game.current_night_role, players)

  if (nextRole) {
    await client.from('games').update({
      current_night_role: nextRole,
      phase_end_at: engine.getPhaseEndTime(settings, 'night').toISOString()
    }).eq('id', game.id)
  }

  return { advanced: true, nightComplete: false }
}

/* ═══════════════════════════════════════════
   VOTE ACTIONS
   ═══════════════════════════════════════════ */

export async function submitVote(
  client: SupabaseClient<Database>,
  game: Game,
  voter: Player,
  targetId: string
): Promise<ActionResult> {
  // Validation
  if (game.status !== 'vote') return fail('Pas de vote en cours')
  if (!voter.is_alive) return fail('Les morts ne peuvent pas voter')

  // Check if already voted
  const existing = await client
    .from('day_votes')
    .select('id')
    .eq('game_id', game.id)
    .eq('day_number', game.day_number)
    .eq('voter_id', voter.id)
    .single()

  if (existing.data) return fail('Tu as déjà voté')

  // Submit vote
  await client.from('day_votes').insert({
    game_id: game.id,
    day_number: game.day_number,
    voter_id: voter.id,
    target_id: targetId
  })

  // Check if voting is complete
  const result = await checkAndResolveVotes(client, game)

  return ok(result ? { resolved: true, ...result } : { resolved: false })
}

export async function checkAndResolveVotes(
  client: SupabaseClient<Database>,
  game: Game
): Promise<{ eliminated: string | null; nextPhase: string } | null> {
  const players = await db.getPlayers(client, game.id)
  const alive = players.filter(p => p.is_alive)
  const votes = await db.getDayVotes(client, game.id, game.day_number)

  // Not everyone voted yet
  if (votes.length < alive.length) return null

  // Count votes
  const counts = db.countVotes(votes)
  const { targetId, isTie } = db.findMajorityTarget(counts)

  // Create result event
  const eliminated = targetId ? players.find(p => p.id === targetId) : null
  const message = isTie
    ? 'Égalité ! Personne n\'est éliminé.'
    : eliminated
      ? `${eliminated.name} a été éliminé par le village !`
      : 'Aucun vote. Personne n\'est éliminé.'

  await db.createGameEvent(client, game.id, 'vote_result', message, {
    eliminated: eliminated?.id || null,
    isTie
  })

  // Handle elimination
  if (eliminated && !isTie) {
    await db.killPlayer(client, eliminated.id)

    // Hunter check
    if (eliminated.role === 'hunter') {
      await engine.transitionToHunter(client, game.id, eliminated)
      return { eliminated: eliminated.id, nextPhase: 'hunter' }
    }
  }

  // Check victory
  const updated = await db.getPlayers(client, game.id)
  const winner = engine.checkVictory(updated)

  if (winner) {
    await engine.endGame(client, game.id, winner)
    return { eliminated: eliminated?.id || null, nextPhase: 'finished' }
  }

  // Transition to night
  await engine.transitionToNight(client, game)
  return { eliminated: eliminated?.id || null, nextPhase: 'night' }
}

/* ═══════════════════════════════════════════
   NIGHT ACTIONS
   ═══════════════════════════════════════════ */

export async function submitNightAction(
  client: SupabaseClient<Database>,
  game: Game,
  player: Player,
  actionType: NightActionType,
  targetId: string | null
): Promise<ActionResult> {
  // Validation
  if (game.status !== 'night') return fail('Ce n\'est pas la nuit')
  if (!player.is_alive) return fail('Les morts ne peuvent pas agir')
  if (!player.role) return fail('Pas de rôle assigné')

  // Check if action is valid for role
  if (!isValidActionForRole(player.role, actionType)) {
    return fail('Action non autorisée pour ce rôle')
  }

  // Witch potion validation
  if (actionType === 'witch_save' && player.witch_heal_used) {
    return fail('Potion de vie déjà utilisée')
  }
  if (actionType === 'witch_kill' && player.witch_kill_used) {
    return fail('Potion de mort déjà utilisée')
  }

  // Check if already acted (for this action type)
  const existing = await client
    .from('night_actions')
    .select('id')
    .eq('game_id', game.id)
    .eq('day_number', game.day_number)
    .eq('player_id', player.id)
    .eq('action_type', actionType)
    .single()

  if (existing.data) return fail('Action déjà effectuée')

  // Submit action
  await db.createNightAction(client, game.id, game.day_number, player.id, actionType, targetId)

  // Update witch potions if used
  if (actionType === 'witch_save') {
    await client.from('players').update({ witch_heal_used: true }).eq('id', player.id)
  }
  if (actionType === 'witch_kill') {
    await client.from('players').update({ witch_kill_used: true }).eq('id', player.id)
  }

  // Get additional data for seer
  let revealedRole: string | null = null
  if (actionType === 'seer_view' && targetId) {
    const target = await client.from('players').select('role').eq('id', targetId).single()
    revealedRole = target.data?.role || null
  }

  // Advance to next role if current role group finished
  const players = await db.getPlayers(client, game.id)

  // Special case: seer gets 5 seconds to see the result before UI changes
  // Don't advance current_night_role immediately, just set a short timer
  if (actionType === 'seer_view') {
    await client.from('games').update({
      phase_end_at: new Date(Date.now() + 5000).toISOString()
    }).eq('id', game.id)
    // check-phase will advance to next role when timer expires
  }
  else {
    // Other roles: advance immediately
    await advanceNightRoleIfNeeded(client, game, players, actionType)
  }

  return ok({
    revealedRole,
    nightComplete: false
  })
}

/* ═══════════════════════════════════════════
   HUNTER ACTIONS
   ═══════════════════════════════════════════ */

export async function submitHunterAction(
  client: SupabaseClient<Database>,
  game: Game,
  hunter: Player,
  targetId: string
): Promise<ActionResult> {
  // Validation
  if (game.status !== 'hunter') return fail('Ce n\'est pas la phase du chasseur')
  if (game.hunter_target_pending !== hunter.id) return fail('Ce n\'est pas ton tour')
  if (hunter.role !== 'hunter') return fail('Tu n\'es pas le chasseur')

  // Get target
  const target = await client.from('players').select('*').eq('id', targetId).single()
  if (!target.data) return fail('Cible invalide')
  if (!target.data.is_alive) return fail('Cette cible est déjà morte')

  // Kill target
  await db.killPlayer(client, targetId)
  await db.createNightAction(client, game.id, game.day_number, hunter.id, 'hunter_kill', targetId)
  await db.createGameEvent(client, game.id, 'hunter_kill',
    `Le chasseur tire une dernière fois et emporte ${target.data.name} dans la tombe !`,
    { hunterId: hunter.id, targetId, targetName: target.data.name })

  // Chain reaction: if target was also hunter (edge case)
  if (target.data.role === 'hunter') {
    await engine.transitionToHunter(client, game.id, target.data as Player)
    return ok({ chainHunter: true, targetName: target.data.name })
  }

  // Check victory
  const players = await db.getPlayers(client, game.id)
  const winner = engine.checkVictory(players)

  if (winner) {
    await engine.endGame(client, game.id, winner)
    return ok({ winner, targetName: target.data.name })
  }

  // Transition to night
  const settings = (game.settings as unknown as GameSettings) || engine.getDefaultSettings()
  const firstNightRole = engine.getFirstNightRole(players)

  await client.from('games').update({
    status: 'night',
    day_number: game.day_number + 1,
    phase_end_at: engine.getPhaseEndTime(settings, 'night').toISOString(),
    hunter_target_pending: null,
    current_night_role: firstNightRole
  }).eq('id', game.id)

  await db.createGameEvent(client, game.id, 'night_start',
    `Nuit ${game.day_number + 1} - Le village s'endort après cette tragédie.`,
    { day_number: game.day_number + 1 })

  return ok({ targetName: target.data.name, nextPhase: 'night' })
}
