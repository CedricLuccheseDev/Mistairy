/**
 * Game Engine - Core game state machine
 * Handles all phase transitions and game flow
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, GameSettings } from '../../shared/types/database.types'
import type { Game, Player, Winner, NightRole } from './types'
import { DEFAULT_SETTINGS } from '../../shared/config/game.config'
import { ROLES_CONFIG } from '../../shared/config/roles.config'
import { HUNTER_PHASE_DURATION_MS } from '../../shared/config/constants'
import * as db from '../services/database'
import { generateNarration } from '../services/narration'

// Import from dedicated modules
import { checkVictory, getVictoryMessage } from './victory'
import { resolveNight, applyNightResult, getNightDeathMessage } from './resolution'

// Re-export from dedicated modules
export { checkVictory, getVictoryMessage } from './victory'
export {
  resolveNight,
  applyNightResult,
  getNightDeathMessage
} from './resolution'

/* ═══════════════════════════════════════════
   SETTINGS
   ═══════════════════════════════════════════ */

export function getDefaultSettings(): GameSettings {
  return { ...DEFAULT_SETTINGS }
}

export function getGameSettings(game: Game): GameSettings {
  return (game.settings as unknown as GameSettings) || getDefaultSettings()
}

export function getPhaseEndTime(settings: GameSettings, phase: Game['status']): Date {
  const durations: Record<string, number> = {
    night: settings.night_time * 1000,
    day: settings.discussion_time * 1000,
    vote: settings.vote_time * 1000,
    hunter: HUNTER_PHASE_DURATION_MS
  }
  return new Date(Date.now() + (durations[phase] || 0))
}

/* ═══════════════════════════════════════════
   PLAYER UTILITIES
   ═══════════════════════════════════════════ */

function getAlivePlayers(players: Player[]): Player[] {
  return players.filter(p => p.is_alive)
}

function hasAliveRole(players: Player[], role: string): boolean {
  return getAlivePlayers(players).some(p => p.role === role)
}

function findAlivePlayerByRole(players: Player[], role: string): Player | undefined {
  return getAlivePlayers(players).find(p => p.role === role)
}

function getAlivePlayersByRole(players: Player[], role: string): Player[] {
  return getAlivePlayers(players).filter(p => p.role === role)
}

/* ═══════════════════════════════════════════
   ACTION TYPE UTILITIES
   ═══════════════════════════════════════════ */

const SEER_ACTIONS = ['seer_view', 'seer_skip'] as const
const WEREWOLF_ACTIONS = ['werewolf_kill', 'werewolf_skip'] as const
const WITCH_ACTIONS = ['witch_save', 'witch_kill', 'witch_skip'] as const

function isSeerAction(actionType: string): boolean {
  return (SEER_ACTIONS as readonly string[]).includes(actionType)
}

function isWerewolfAction(actionType: string): boolean {
  return (WEREWOLF_ACTIONS as readonly string[]).includes(actionType)
}

function isWitchAction(actionType: string): boolean {
  return (WITCH_ACTIONS as readonly string[]).includes(actionType)
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

// Night → day_intro (narration phase, no timer)
export async function transitionToDay(
  client: SupabaseClient<Database>,
  game: Game,
  players: Player[],
  geminiApiKey?: string
): Promise<TransitionResult> {
  const nightResult = await resolveNight(client, game.id, game.day_number, players)
  const deadPlayers = await applyNightResult(client, nightResult)

  await db.createGameEvent(client, game.id, 'night_end', getNightDeathMessage(deadPlayers), {
    dead: deadPlayers.map(p => ({ id: p.id, name: p.name, role: p.role })),
    day_number: game.day_number
  })

  // Check victory
  const updated = await db.getPlayers(client, game.id)
  const alivePlayers = getAlivePlayers(updated)
  const winner = checkVictory(updated)

  if (winner) {
    await endGame(client, game.id, winner, undefined, geminiApiKey)
    return { success: true, winner, deadPlayers, nextPhase: 'finished' }
  }

  // Check if hunter died during the night
  const hunterDead = deadPlayers.find(p => p.role === 'hunter')
  if (hunterDead) {
    return await transitionToHunter(client, game.id, hunterDead, 'night', geminiApiKey)
  }

  // Generate day narration with victims info (including role names)
  const victimNames = deadPlayers.map(p => {
    const roleName = ROLES_CONFIG[p.role as keyof typeof ROLES_CONFIG]?.name || 'Villageois'
    return `${p.name} (${roleName})`
  })

  // Generate AI narration for day intro
  const narration = await generateNarration('day_intro', {
    gameId: game.id,
    dayNumber: game.day_number,
    playerCount: players.length,
    aliveCount: alivePlayers.length,
    victimNames: victimNames.length > 0 ? victimNames : undefined
  }, geminiApiKey)

  // Transition to day_intro (narration phase, no timer)
  await client.from('games').update({
    status: 'day_intro',
    phase_end_at: null,
    current_night_role: null,
    narration_text: narration
  }).eq('id', game.id)

  await db.createGameEvent(client, game.id, 'day_intro',
    `Jour ${game.day_number} - Le soleil se lève...`, {})

  return { success: true, deadPlayers, nextPhase: 'day_intro' }
}

// day_intro → day (start debate with timer)
export async function startDayDebate(
  client: SupabaseClient<Database>,
  game: Game
): Promise<TransitionResult> {
  if (game.status !== 'day_intro') {
    return { success: true, nextPhase: game.status }
  }

  const settings = getGameSettings(game)

  await client.from('games').update({
    status: 'day',
    phase_end_at: getPhaseEndTime(settings, 'day').toISOString(),
    narration_text: null
  }).eq('id', game.id)

  await db.createGameEvent(client, game.id, 'day_start',
    `Jour ${game.day_number} - Le village débat. Qui sera éliminé ?`, {})

  return { success: true, nextPhase: 'day' }
}

// Day → Vote
export async function transitionToVote(
  client: SupabaseClient<Database>,
  game: Game,
  geminiApiKey?: string
): Promise<TransitionResult> {
  const settings = getGameSettings(game)
  const players = await db.getPlayers(client, game.id)
  const alivePlayers = getAlivePlayers(players)

  // Generate AI narration for vote phase
  const narration = await generateNarration('vote_start', {
    gameId: game.id,
    dayNumber: game.day_number,
    playerCount: players.length,
    aliveCount: alivePlayers.length
  }, geminiApiKey)

  await client.from('games').update({
    status: 'vote',
    phase_end_at: getPhaseEndTime(settings, 'vote').toISOString(),
    narration_text: narration
  }).eq('id', game.id)

  await db.createGameEvent(client, game.id, 'vote_start',
    'Le temps du vote est venu. Désignez celui que vous souhaitez éliminer.', {})

  return { success: true, nextPhase: 'vote' }
}

// Vote → vote_result (10 second display of who died)
export async function transitionToVoteResult(
  client: SupabaseClient<Database>,
  game: Game,
  eliminatedPlayer: Player | null,
  isTie: boolean,
  geminiApiKey?: string
): Promise<TransitionResult & { eliminated: string | null }> {
  const players = await db.getPlayers(client, game.id)
  const alivePlayers = getAlivePlayers(players)

  // Get role name for eliminated player
  const victimRole = eliminatedPlayer?.role
    ? ROLES_CONFIG[eliminatedPlayer.role as keyof typeof ROLES_CONFIG]?.name || 'Villageois'
    : undefined

  // Generate AI narration for vote result
  const narration = await generateNarration('vote_result', {
    gameId: game.id,
    dayNumber: game.day_number,
    playerCount: players.length,
    aliveCount: alivePlayers.length,
    victimName: eliminatedPlayer?.name,
    victimRole,
    isTie,
    killedBy: 'village'
  }, geminiApiKey)

  // Transition to vote_result (10 seconds)
  await client.from('games').update({
    status: 'vote_result',
    phase_end_at: new Date(Date.now() + 10000).toISOString(),
    narration_text: narration
  }).eq('id', game.id)

  return { success: true, nextPhase: 'vote_result', eliminated: eliminatedPlayer?.name || null }
}

// vote_result → night_intro (or hunter if applicable)
export async function transitionFromVoteResult(
  client: SupabaseClient<Database>,
  game: Game,
  geminiApiKey?: string
): Promise<TransitionResult> {
  // Get players to check for hunter
  const players = await db.getPlayers(client, game.id)

  // Find the player who was just killed (from game events)
  const { data: recentEvents } = await client
    .from('game_events')
    .select('*')
    .eq('game_id', game.id)
    .eq('event_type', 'vote_result')
    .order('created_at', { ascending: false })
    .limit(1)

  const eventData = recentEvents?.[0]?.data as Record<string, unknown> | null
  const eliminatedId = eventData?.eliminated as string | null
  const eliminated = eliminatedId ? players.find(p => p.id === eliminatedId) : null

  // Check if eliminated player was hunter
  if (eliminated?.role === 'hunter') {
    return await transitionToHunter(client, game.id, eliminated, 'vote', geminiApiKey)
  }

  // Check victory
  const winner = checkVictory(players)
  if (winner) {
    await endGame(client, game.id, winner, getAlivePlayers(players), geminiApiKey)
    return { success: true, winner, nextPhase: 'finished' }
  }

  // Transition to night_intro
  return await transitionToNight(client, game, geminiApiKey)
}

// vote_result → night_intro (narration phase, no timer)
export async function transitionToNight(
  client: SupabaseClient<Database>,
  game: Game,
  geminiApiKey?: string
): Promise<TransitionResult> {
  const players = await db.getPlayers(client, game.id)
  const alivePlayers = getAlivePlayers(players)
  const winner = checkVictory(players)

  if (winner) {
    await endGame(client, game.id, winner, alivePlayers, geminiApiKey)
    return { success: true, winner, nextPhase: 'finished' }
  }

  const newDayNumber = game.day_number + 1

  // Generate AI narration for night intro
  const narration = await generateNarration('night_intro', {
    gameId: game.id,
    dayNumber: newDayNumber,
    playerCount: players.length,
    aliveCount: alivePlayers.length,
    isFirstNight: newDayNumber === 1,
    playerNames: alivePlayers.map(p => p.name)
  }, geminiApiKey)

  // Transition to night_intro (narration phase, no timer)
  await client.from('games').update({
    status: 'night_intro',
    day_number: newDayNumber,
    phase_end_at: null,
    current_night_role: null,
    narration_text: narration
  }).eq('id', game.id)

  await db.createGameEvent(client, game.id, 'night_intro',
    `Nuit ${newDayNumber} - Le village s'endort...`,
    { day_number: newDayNumber })

  return { success: true, nextPhase: 'night_intro' }
}

// → Hunter phase
// diedAt is optional for chain hunters (preserve original hunter_died_at)
export async function transitionToHunter(
  client: SupabaseClient<Database>,
  gameId: string,
  hunter: Player,
  diedAt?: 'night' | 'vote',
  geminiApiKey?: string
): Promise<TransitionResult> {
  // Get game for context
  const { data: game } = await client.from('games').select('*').eq('id', gameId).single()
  const players = await db.getPlayers(client, gameId)
  const alivePlayers = getAlivePlayers(players)

  // Generate AI narration for hunter death
  const narration = await generateNarration('hunter_death', {
    gameId,
    dayNumber: game?.day_number || 1,
    playerCount: players.length,
    aliveCount: alivePlayers.length,
    victimName: hunter.name
  }, geminiApiKey)

  // Only update hunter_died_at if provided (first hunter death)
  // Chain hunters preserve the original value
  const updateData: Record<string, unknown> = {
    status: 'hunter',
    hunter_target_pending: hunter.id,
    phase_end_at: new Date(Date.now() + HUNTER_PHASE_DURATION_MS).toISOString(),
    narration_text: narration
  }
  if (diedAt) updateData.hunter_died_at = diedAt

  await client.from('games').update(updateData).eq('id', gameId)

  await db.createGameEvent(client, gameId, 'hunter_death',
    `${hunter.name} était le chasseur ! Il peut emporter quelqu'un avec lui.`,
    { hunterId: hunter.id, diedAt })

  return { success: true, nextPhase: 'hunter' }
}

// Hunter has shot → transition to next phase based on where hunter died
export async function transitionAfterHunter(
  client: SupabaseClient<Database>,
  game: Game,
  hunterVictimName?: string | null,
  geminiApiKey?: string
): Promise<TransitionResult> {
  const players = await db.getPlayers(client, game.id)
  const alivePlayers = getAlivePlayers(players)
  const winner = checkVictory(players)

  if (winner) {
    await endGame(client, game.id, winner, alivePlayers, geminiApiKey)
    return { success: true, winner, nextPhase: 'finished' }
  }

  // Clear hunter state
  await client.from('games').update({
    hunter_target_pending: null,
    hunter_died_at: null
  }).eq('id', game.id)

  // Transition based on where hunter died
  if (game.hunter_died_at === 'night') {
    // Hunter died at night → go to day_intro
    // Generate AI narration for day intro after hunter shot
    const narration = await generateNarration('day_intro', {
      gameId: game.id,
      dayNumber: game.day_number,
      playerCount: players.length,
      aliveCount: alivePlayers.length,
      victimNames: hunterVictimName ? [hunterVictimName] : undefined
    }, geminiApiKey)

    await client.from('games').update({
      status: 'day_intro',
      phase_end_at: null,
      narration_text: narration
    }).eq('id', game.id)
    return { success: true, nextPhase: 'day_intro' }
  }
  else {
    // Hunter died at vote → go to night_intro
    const newDayNumber = game.day_number + 1

    // Generate AI narration for night intro
    const narration = await generateNarration('night_intro', {
      gameId: game.id,
      dayNumber: newDayNumber,
      playerCount: players.length,
      aliveCount: alivePlayers.length,
      isFirstNight: false,
      playerNames: alivePlayers.map(p => p.name)
    }, geminiApiKey)

    await client.from('games').update({
      status: 'night_intro',
      day_number: newDayNumber,
      phase_end_at: null,
      current_night_role: null,
      narration_text: narration
    }).eq('id', game.id)
    await db.createGameEvent(client, game.id, 'night_intro',
      `Nuit ${newDayNumber} - Le village s'endort...`,
      { day_number: newDayNumber })
    return { success: true, nextPhase: 'night_intro' }
  }
}

// → Finished
export async function endGame(
  client: SupabaseClient<Database>,
  gameId: string,
  winner: Winner,
  alivePlayers?: Player[],
  geminiApiKey?: string
): Promise<void> {
  // Get game and alive players
  const { data: game } = await client.from('games').select('*').eq('id', gameId).single()
  const players = await db.getPlayers(client, gameId)
  const alive = alivePlayers || getAlivePlayers(players)

  // Generate AI narration for game end
  const narration = await generateNarration('game_end', {
    gameId,
    dayNumber: game?.day_number || 1,
    playerCount: players.length,
    aliveCount: alive.length,
    winner: winner || undefined,
    playerNames: alive.map(p => p.name)
  }, geminiApiKey)

  await client.from('games').update({
    status: 'finished',
    winner,
    phase_end_at: null,
    hunter_target_pending: null,
    narration_text: narration
  }).eq('id', gameId)

  await db.createGameEvent(client, gameId, 'game_end', getVictoryMessage(winner), { winner })
}

/* ═══════════════════════════════════════════
   NIGHT ROLE MANAGEMENT
   ═══════════════════════════════════════════ */

// Night role order: seer → werewolf → witch
const NIGHT_ROLE_ORDER: NightRole[] = ['seer', 'werewolf', 'witch']

// Narration messages for each night role
const NIGHT_ROLE_NARRATIONS: Record<NightRole, string> = {
  seer: 'La voyante ouvre les yeux. Elle peut sonder l\'âme d\'un joueur et découvrir sa vraie nature.',
  werewolf: 'Les loups-garous se réveillent et se reconnaissent. Ils doivent choisir ensemble leur victime.',
  witch: 'La sorcière ouvre les yeux. Elle possède deux potions : une de vie et une de mort.'
}

export function getNightRoleNarration(role: NightRole): string {
  return NIGHT_ROLE_NARRATIONS[role]
}

// night_intro → night (start night gameplay with timer)
export async function startNightPhase(
  client: SupabaseClient<Database>,
  game: Game
): Promise<TransitionResult> {
  if (game.status !== 'night_intro') {
    return { success: true, nextPhase: game.status }
  }

  const players = await db.getPlayers(client, game.id)
  const firstNightRole = getFirstNightRole(players)
  const settings = getGameSettings(game)

  // Set the first night role with its narration and timer
  const narration = firstNightRole ? getNightRoleNarration(firstNightRole) : null

  await client.from('games').update({
    status: 'night',
    phase_end_at: getPhaseEndTime(settings, 'night').toISOString(),
    current_night_role: firstNightRole,
    narration_text: narration
  }).eq('id', game.id)

  await db.createGameEvent(client, game.id, 'night_start',
    `Nuit ${game.day_number} - Les créatures de la nuit s'éveillent...`,
    { day_number: game.day_number })

  return { success: true, nextPhase: 'night' }
}

export function getFirstNightRole(players: Player[]): NightRole | null {
  for (const role of NIGHT_ROLE_ORDER) {
    if (hasAliveRole(players, role)) return role
  }
  return null
}

export async function getCurrentNightRole(
  client: SupabaseClient<Database>,
  gameId: string,
  dayNumber: number,
  players: Player[]
): Promise<NightRole | null> {
  const actions = await db.getNightActions(client, gameId, dayNumber)

  // Check seer
  const seer = findAlivePlayerByRole(players, 'seer')
  if (seer) {
    const seerActed = actions.some(a => isSeerAction(a.action_type))
    if (!seerActed) return 'seer'
  }

  // Check werewolves
  const wolves = getAlivePlayersByRole(players, 'werewolf')
  if (wolves.length > 0) {
    const wolfActions = actions.filter(a => isWerewolfAction(a.action_type))
    if (wolfActions.length < wolves.length) return 'werewolf'
  }

  // Check witch
  const witch = findAlivePlayerByRole(players, 'witch')
  if (witch) {
    const witchActed = actions.some(a =>
      a.player_id === witch.id && isWitchAction(a.action_type)
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

  const currentIndex = NIGHT_ROLE_ORDER.indexOf(currentRole)

  // Find next role that has alive players
  for (let i = currentIndex + 1; i < NIGHT_ROLE_ORDER.length; i++) {
    const role = NIGHT_ROLE_ORDER[i]!
    if (hasAliveRole(players, role)) return role
  }

  return null
}

// Shared helper to update game state to next night role
export async function updateToNextNightRole(
  client: SupabaseClient<Database>,
  gameId: string,
  nextRole: NightRole,
  settings: GameSettings
): Promise<void> {
  const narration = getNightRoleNarration(nextRole)
  await client.from('games').update({
    current_night_role: nextRole,
    phase_end_at: getPhaseEndTime(settings, 'night').toISOString(),
    narration_text: narration
  }).eq('id', gameId)
}

export async function advanceToNextNightRole(
  client: SupabaseClient<Database>,
  game: Game,
  players: Player[],
  settings: GameSettings,
  geminiApiKey?: string
): Promise<{ nextRole: NightRole | null; transitionedToDay: boolean }> {
  // Use current_night_role from game state (simpler than recalculating from actions)
  const currentRole = game.current_night_role
  const alivePlayers = getAlivePlayers(players)

  // Get all existing actions for this night (to avoid duplicates)
  const existingActions = await db.getNightActions(client, game.id, game.day_number)

  // Handle timeout for the current role
  if (currentRole === 'seer') {
    const seer = findAlivePlayerByRole(players, 'seer')
    if (seer) {
      // Check if seer already acted
      const seerActed = existingActions.some(a => isSeerAction(a.action_type))
      if (!seerActed) {
        // Seer must view someone - pick random target
        const targets = alivePlayers.filter(p => p.id !== seer.id)
        if (targets.length > 0) {
          const randomTarget = targets[Math.floor(Math.random() * targets.length)]!
          await db.createNightAction(client, game.id, game.day_number, seer.id, 'seer_view', randomTarget.id)
        }
        else {
          await db.createNightAction(client, game.id, game.day_number, seer.id, 'seer_skip', null)
        }
      }
    }
  }
  else if (currentRole === 'werewolf') {
    const wolves = getAlivePlayersByRole(players, 'werewolf')
    const wolfActions = existingActions.filter(a => isWerewolfAction(a.action_type))

    // Find the most voted target, or pick random if no votes
    const targetVotes = new Map<string, number>()
    for (const action of wolfActions) {
      if (action.action_type === 'werewolf_kill' && action.target_id) {
        targetVotes.set(action.target_id, (targetVotes.get(action.target_id) || 0) + 1)
      }
    }

    // Determine target: most voted or random
    let targetId: string | null = null
    const nonWolfTargets = alivePlayers.filter(p => p.role !== 'werewolf')

    if (targetVotes.size > 0) {
      // Find target with most votes
      let maxVotes = 0
      const topTargets: string[] = []
      for (const [id, count] of targetVotes) {
        if (count > maxVotes) {
          maxVotes = count
          topTargets.length = 0
          topTargets.push(id)
        }
        else if (count === maxVotes) {
          topTargets.push(id)
        }
      }
      // If tie, pick random among tied
      targetId = topTargets[Math.floor(Math.random() * topTargets.length)] || null
    }
    else if (nonWolfTargets.length > 0) {
      // No votes, pick random
      const randomTarget = nonWolfTargets[Math.floor(Math.random() * nonWolfTargets.length)]!
      targetId = randomTarget.id
    }

    // Create kill actions for all wolves that haven't acted
    const actedWolfIds = new Set(wolfActions.map(a => a.player_id))
    for (const wolf of wolves) {
      if (!actedWolfIds.has(wolf.id)) {
        await db.createNightAction(client, game.id, game.day_number, wolf.id, 'werewolf_kill', targetId)
      }
    }
  }
  else if (currentRole === 'witch') {
    // Witch can skip - no forced action
    const witch = findAlivePlayerByRole(players, 'witch')
    if (witch) {
      // Check if witch already acted
      const witchActed = existingActions.some(a =>
        a.player_id === witch.id && isWitchAction(a.action_type)
      )
      if (!witchActed) {
        await db.createNightAction(client, game.id, game.day_number, witch.id, 'witch_skip', null)
      }
    }
  }

  // Get the next role
  const nextRole = getNextNightRole(currentRole, players)

  if (!nextRole) {
    // All night roles done, transition to day
    await transitionToDay(client, game, players, geminiApiKey)
    return { nextRole: null, transitionedToDay: true }
  }

  // Set timer for next role, update current_night_role and narration_text
  await updateToNextNightRole(client, game.id, nextRole, settings)

  // Create event for next role waking up
  const narration = getNightRoleNarration(nextRole)
  await db.createGameEvent(client, game.id, 'night_role_wake',
    narration, { role: nextRole })

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

  // All werewolves must act (or skip)
  const wolves = getAlivePlayersByRole(players, 'werewolf')
  const wolfActions = actions.filter(a => isWerewolfAction(a.action_type))
  if (wolfActions.length < wolves.length) return false

  // Seer must act or skip (if alive)
  const seer = findAlivePlayerByRole(players, 'seer')
  if (seer && !actions.find(a => isSeerAction(a.action_type))) return false

  // Witch must act (use a potion or skip) if alive
  const witch = findAlivePlayerByRole(players, 'witch')
  if (witch) {
    const witchActions = actions.filter(a =>
      a.player_id === witch.id && isWitchAction(a.action_type)
    )
    if (witchActions.length === 0) return false
  }

  return true
}
