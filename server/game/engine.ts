/**
 * Game Engine - Core game state machine
 * Handles all phase transitions, victory conditions, and game flow
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, GameSettings } from '../../shared/types/database.types'
import type { Game, Player, NightResult, Winner, NightRole } from './types'
import { DEFAULT_SETTINGS } from '../../shared/config/game.config'
import * as db from '../services/database'

/* ═══════════════════════════════════════════
   SETTINGS
   ═══════════════════════════════════════════ */

export function getDefaultSettings(): GameSettings {
  return { ...DEFAULT_SETTINGS }
}

export function getPhaseEndTime(settings: GameSettings, phase: Game['status']): Date {
  const durations: Record<string, number> = {
    night: settings.night_time * 1000,
    day: settings.discussion_time * 1000,
    vote: settings.vote_time * 1000,
    hunter: 30000 // 30 seconds for hunter
  }
  return new Date(Date.now() + (durations[phase] || 0))
}

/* ═══════════════════════════════════════════
   VICTORY CONDITIONS
   ═══════════════════════════════════════════ */

export function checkVictory(players: Player[]): Winner {
  const alive = players.filter(p => p.is_alive)
  const wolves = alive.filter(p => p.role === 'werewolf')
  const villagers = alive.filter(p => p.role !== 'werewolf')

  if (wolves.length === 0) return 'village'
  if (wolves.length >= villagers.length) return 'werewolf'
  return null
}

export function getVictoryMessage(winner: Winner): string {
  if (winner === 'village') {
    return 'Le village a éliminé tous les loups-garous ! Les villageois remportent la victoire !'
  }
  if (winner === 'werewolf') {
    return 'Les loups-garous ont dévoré le village ! Les loups remportent la victoire !'
  }
  return ''
}

/* ═══════════════════════════════════════════
   NIGHT RESOLUTION
   ═══════════════════════════════════════════ */

export async function resolveNight(
  client: SupabaseClient<Database>,
  gameId: string,
  dayNumber: number,
  players: Player[]
): Promise<NightResult> {
  const actions = await db.getNightActions(client, gameId, dayNumber)

  const result: NightResult = {
    killedByWolves: null,
    savedByWitch: false,
    killedByWitch: null,
    seerTarget: null
  }

  if (actions.length === 0) return result

  // Count werewolf kills
  const wolfVotes = actions
    .filter(a => a.action_type === 'werewolf_kill' && a.target_id)
    .map(a => ({ target_id: a.target_id! }))

  const voteCounts = db.countVotes(wolfVotes)
  const { targetId: wolfVictimId } = db.findMajorityTarget(voteCounts)

  if (wolfVictimId) {
    result.killedByWolves = players.find(p => p.id === wolfVictimId) || null
  }

  // Witch save
  const witchHeal = actions.find(a => a.action_type === 'witch_save')
  if (witchHeal?.target_id === wolfVictimId) {
    result.savedByWitch = true
    result.killedByWolves = null
  }

  // Witch kill
  const witchKill = actions.find(a => a.action_type === 'witch_kill')
  if (witchKill?.target_id) {
    result.killedByWitch = players.find(p => p.id === witchKill.target_id) || null
  }

  // Seer view
  const seerLook = actions.find(a => a.action_type === 'seer_view')
  if (seerLook?.target_id) {
    result.seerTarget = players.find(p => p.id === seerLook.target_id) || null
  }

  return result
}

export async function applyNightResult(
  client: SupabaseClient<Database>,
  result: NightResult
): Promise<Player[]> {
  const dead: Player[] = []

  if (result.killedByWolves) {
    await db.killPlayer(client, result.killedByWolves.id)
    dead.push(result.killedByWolves)
  }

  if (result.killedByWitch) {
    await db.killPlayer(client, result.killedByWitch.id)
    dead.push(result.killedByWitch)
  }

  return dead
}

export function getNightDeathMessage(dead: Player[]): string {
  if (dead.length === 0) return 'Le village se réveille. Personne n\'est mort cette nuit.'
  if (dead.length === 1) return `Le village se réveille. ${dead[0]!.name} a été retrouvé mort cette nuit.`
  return `Le village se réveille. ${dead.map(p => p.name).join(' et ')} ont été retrouvés morts cette nuit.`
}

/* ═══════════════════════════════════════════
   PHASE TRANSITIONS
   ═══════════════════════════════════════════ */

export interface TransitionResult {
  success: boolean
  winner?: Winner
  deadPlayers?: Player[]
  nextPhase: Game['status']
}

// Night → Day
export async function transitionToDay(
  client: SupabaseClient<Database>,
  game: Game,
  players: Player[]
): Promise<TransitionResult> {
  const nightResult = await resolveNight(client, game.id, game.day_number, players)
  const deadPlayers = await applyNightResult(client, nightResult)

  await db.createGameEvent(client, game.id, 'night_end', getNightDeathMessage(deadPlayers), {
    dead: deadPlayers.map(p => ({ id: p.id, name: p.name, role: p.role }))
  })

  // Check victory
  const updated = await db.getPlayers(client, game.id)
  const winner = checkVictory(updated)

  if (winner) {
    await endGame(client, game.id, winner)
    return { success: true, winner, deadPlayers, nextPhase: 'finished' }
  }

  // Transition to day
  const settings = (game.settings as unknown as GameSettings) || getDefaultSettings()
  await client.from('games').update({
    status: 'day',
    phase_end_at: getPhaseEndTime(settings, 'day').toISOString(),
    current_night_role: null
  }).eq('id', game.id)

  await db.createGameEvent(client, game.id, 'day_start',
    `Jour ${game.day_number} - Le village débat. Qui sera éliminé ?`, {})

  return { success: true, deadPlayers, nextPhase: 'day' }
}

// Day → Vote
export async function transitionToVote(
  client: SupabaseClient<Database>,
  game: Game
): Promise<TransitionResult> {
  const settings = (game.settings as unknown as GameSettings) || getDefaultSettings()

  await client.from('games').update({
    status: 'vote',
    phase_end_at: getPhaseEndTime(settings, 'vote').toISOString()
  }).eq('id', game.id)

  await db.createGameEvent(client, game.id, 'vote_start',
    'Le temps du vote est venu. Désignez celui que vous souhaitez éliminer.', {})

  return { success: true, nextPhase: 'vote' }
}

// Vote → Night (or Hunter/Finished)
export async function transitionToNight(
  client: SupabaseClient<Database>,
  game: Game
): Promise<TransitionResult> {
  const players = await db.getPlayers(client, game.id)
  const winner = checkVictory(players)

  if (winner) {
    await endGame(client, game.id, winner)
    return { success: true, winner, nextPhase: 'finished' }
  }

  const settings = (game.settings as unknown as GameSettings) || getDefaultSettings()

  // Determine first night role based on alive players
  const firstNightRole = getFirstNightRole(players)

  await client.from('games').update({
    status: 'night',
    day_number: game.day_number + 1,
    phase_end_at: getPhaseEndTime(settings, 'night').toISOString(),
    current_night_role: firstNightRole
  }).eq('id', game.id)

  await db.createGameEvent(client, game.id, 'night_start',
    `Nuit ${game.day_number + 1} - Le village s'endort. Les loups-garous se réveillent...`,
    { day_number: game.day_number + 1 })

  return { success: true, nextPhase: 'night' }
}

// → Hunter phase
export async function transitionToHunter(
  client: SupabaseClient<Database>,
  gameId: string,
  hunter: Player
): Promise<TransitionResult> {
  await client.from('games').update({
    status: 'hunter',
    hunter_target_pending: hunter.id,
    phase_end_at: new Date(Date.now() + 30000).toISOString()
  }).eq('id', gameId)

  await db.createGameEvent(client, gameId, 'hunter_death',
    `${hunter.name} était le chasseur ! Il peut emporter quelqu'un avec lui.`,
    { hunterId: hunter.id })

  return { success: true, nextPhase: 'hunter' }
}

// → Finished
export async function endGame(
  client: SupabaseClient<Database>,
  gameId: string,
  winner: Winner
): Promise<void> {
  await client.from('games').update({
    status: 'finished',
    winner,
    phase_end_at: null,
    hunter_target_pending: null
  }).eq('id', gameId)

  await db.createGameEvent(client, gameId, 'game_end', getVictoryMessage(winner), { winner })
}

/* ═══════════════════════════════════════════
   NIGHT ROLE MANAGEMENT
   ═══════════════════════════════════════════ */

// Night role order: seer → werewolf → witch
const NIGHT_ROLE_ORDER: NightRole[] = ['seer', 'werewolf', 'witch']

export function getFirstNightRole(players: Player[]): NightRole | null {
  const alive = players.filter(p => p.is_alive)

  // Return first role in order that has alive players
  if (alive.some(p => p.role === 'seer')) return 'seer'
  if (alive.some(p => p.role === 'werewolf')) return 'werewolf'
  if (alive.some(p => p.role === 'witch')) return 'witch'

  return null
}

export async function getCurrentNightRole(
  client: SupabaseClient<Database>,
  gameId: string,
  dayNumber: number,
  players: Player[]
): Promise<NightRole | null> {
  const actions = await db.getNightActions(client, gameId, dayNumber)
  const alive = players.filter(p => p.is_alive)

  // Check seer
  const seer = alive.find(p => p.role === 'seer')
  if (seer) {
    const seerActed = actions.some(a => ['seer_view', 'seer_skip'].includes(a.action_type))
    if (!seerActed) return 'seer'
  }

  // Check werewolves
  const wolves = alive.filter(p => p.role === 'werewolf')
  if (wolves.length > 0) {
    const wolfActions = actions.filter(a => ['werewolf_kill', 'werewolf_skip'].includes(a.action_type))
    if (wolfActions.length < wolves.length) return 'werewolf'
  }

  // Check witch
  const witch = alive.find(p => p.role === 'witch')
  if (witch) {
    const witchActed = actions.some(a =>
      a.player_id === witch.id &&
      ['witch_save', 'witch_kill', 'witch_skip'].includes(a.action_type)
    )
    if (!witchActed) return 'witch'
  }

  // All roles have acted
  return null
}

export function getNextNightRole(
  currentRole: NightRole | null,
  players: Player[]
): NightRole | null {
  if (!currentRole) return null

  const alive = players.filter(p => p.is_alive)
  const currentIndex = NIGHT_ROLE_ORDER.indexOf(currentRole)

  // Find next role that has alive players
  for (let i = currentIndex + 1; i < NIGHT_ROLE_ORDER.length; i++) {
    const role = NIGHT_ROLE_ORDER[i]
    if (role === 'seer' && alive.some(p => p.role === 'seer')) return 'seer'
    if (role === 'werewolf' && alive.some(p => p.role === 'werewolf')) return 'werewolf'
    if (role === 'witch' && alive.some(p => p.role === 'witch')) return 'witch'
  }

  return null
}

export async function advanceToNextNightRole(
  client: SupabaseClient<Database>,
  game: Game,
  players: Player[],
  settings: GameSettings
): Promise<{ nextRole: NightRole | null; transitionedToDay: boolean }> {
  // Use current_night_role from game state (simpler than recalculating from actions)
  const currentRole = game.current_night_role
  const alive = players.filter(p => p.is_alive)

  // Create skip actions for the current role that timed out
  if (currentRole === 'seer') {
    const seer = alive.find(p => p.role === 'seer')
    if (seer) {
      await db.createNightAction(client, game.id, game.day_number, seer.id, 'seer_skip', null)
    }
  }
  else if (currentRole === 'werewolf') {
    const wolves = alive.filter(p => p.role === 'werewolf')
    const actions = await db.getNightActions(client, game.id, game.day_number)
    const wolfActions = actions.filter(a => ['werewolf_kill', 'werewolf_skip'].includes(a.action_type))
    const actedWolfIds = new Set(wolfActions.map(a => a.player_id))

    for (const wolf of wolves) {
      if (!actedWolfIds.has(wolf.id)) {
        await db.createNightAction(client, game.id, game.day_number, wolf.id, 'werewolf_skip', null)
      }
    }
  }
  else if (currentRole === 'witch') {
    const witch = alive.find(p => p.role === 'witch')
    if (witch) {
      await db.createNightAction(client, game.id, game.day_number, witch.id, 'witch_skip', null)
    }
  }

  // Get the next role
  const nextRole = getNextNightRole(currentRole, players)

  if (!nextRole) {
    // All night roles done, transition to day
    await transitionToDay(client, game, players)
    return { nextRole: null, transitionedToDay: true }
  }

  // Set timer for next role and update current_night_role
  await client.from('games').update({
    phase_end_at: getPhaseEndTime(settings, 'night').toISOString(),
    current_night_role: nextRole
  }).eq('id', game.id)

  // Create event for next role waking up
  const roleMessages: Record<string, string> = {
    seer: 'La voyante se réveille et consulte les esprits...',
    werewolf: 'Les loups-garous se réveillent et choisissent leur victime...',
    witch: 'La sorcière se réveille et prépare ses potions...'
  }

  await db.createGameEvent(client, game.id, 'night_role_wake',
    roleMessages[nextRole] || '', { role: nextRole })

  return { nextRole, transitionedToDay: false }
}

/* ═══════════════════════════════════════════
   NIGHT COMPLETION CHECK
   ═══════════════════════════════════════════ */

export async function hasNightEnded(
  client: SupabaseClient<Database>,
  gameId: string,
  dayNumber: number,
  players: Player[]
): Promise<boolean> {
  const actions = await db.getNightActions(client, gameId, dayNumber)
  const alive = players.filter(p => p.is_alive)

  // All werewolves must act (or skip)
  const wolves = alive.filter(p => p.role === 'werewolf')
  const wolfActions = actions.filter(a => ['werewolf_kill', 'werewolf_skip'].includes(a.action_type))
  if (wolfActions.length < wolves.length) return false

  // Seer must act or skip (if alive)
  const seer = alive.find(p => p.role === 'seer')
  if (seer && !actions.find(a => ['seer_view', 'seer_skip'].includes(a.action_type))) return false

  // Witch must act (use a potion or skip) if alive
  const witch = alive.find(p => p.role === 'witch')
  if (witch) {
    const witchActions = actions.filter(a =>
      a.player_id === witch.id &&
      ['witch_save', 'witch_kill', 'witch_skip'].includes(a.action_type)
    )
    if (witchActions.length === 0) return false
  }

  return true
}
