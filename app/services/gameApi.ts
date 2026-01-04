/**
 * Game API Service
 * Centralized, typed API calls for all game operations
 */

import type { GameSettings } from '#shared/types/database.types'
import type { NightActionType } from '#shared/types/game'

/* ═══════════════════════════════════════════
   RESPONSE TYPES
   ═══════════════════════════════════════════ */

export interface JoinResponse {
  code: string
  gameId: string
  playerId: string
  isHost: boolean
}

export interface CreateResponse {
  code: string
  gameId: string
}

export interface ExistsResponse {
  exists: boolean
  status?: string
}

export interface ActionResponse {
  success: boolean
  revealedRole?: string
  resolved?: boolean
  eliminated?: string | null
  winner?: 'village' | 'werewolf'
  nextPhase?: string
}

export interface CheckPhaseResponse {
  advanced: boolean
  reason?: string
  from?: string
  to?: string
  winner?: 'village' | 'werewolf'
  timeLeft?: number
  nextRole?: string
}

export interface StartResponse {
  success: boolean
  message?: string
}

/* ═══════════════════════════════════════════
   GAME MANAGEMENT
   ═══════════════════════════════════════════ */

export async function createGame(): Promise<CreateResponse> {
  return await $fetch('/api/game/create', {
    method: 'POST'
  })
}

export async function checkGameExists(code: string): Promise<ExistsResponse> {
  return await $fetch('/api/game/exists', {
    method: 'GET',
    query: { code: code.toUpperCase() }
  })
}

export async function joinGame(code: string, playerName: string): Promise<JoinResponse> {
  return await $fetch('/api/game/join', {
    method: 'POST',
    body: { code: code.toUpperCase(), playerName }
  })
}

export async function leaveGame(gameId: string, playerId: string): Promise<void> {
  await $fetch('/api/game/leave', {
    method: 'POST',
    body: { gameId, playerId }
  })
}

export async function updateSettings(gameId: string, settings: Partial<GameSettings>): Promise<void> {
  await $fetch('/api/game/update-settings', {
    method: 'POST',
    body: { gameId, settings }
  })
}

export async function deleteOrphanGame(gameId: string): Promise<void> {
  await $fetch('/api/game/delete-orphan', {
    method: 'POST',
    body: { gameId }
  })
}

/* ═══════════════════════════════════════════
   GAME FLOW
   ═══════════════════════════════════════════ */

export async function startGame(gameId: string, playerId: string): Promise<StartResponse> {
  return await $fetch('/api/game/start', {
    method: 'POST',
    body: { gameId, playerId }
  })
}

export async function startNight(gameId: string): Promise<StartResponse> {
  return await $fetch('/api/game/start-night', {
    method: 'POST',
    body: { gameId }
  })
}

export async function startDay(gameId: string): Promise<StartResponse> {
  return await $fetch('/api/game/start-day', {
    method: 'POST',
    body: { gameId }
  })
}

export async function checkPhase(gameId: string): Promise<CheckPhaseResponse> {
  return await $fetch('/api/game/check-phase', {
    method: 'POST',
    body: { gameId }
  })
}

export async function setReady(gameId: string, playerId: string): Promise<void> {
  await $fetch('/api/game/ready', {
    method: 'POST',
    body: { gameId, playerId }
  })
}

export async function restartGame(gameId: string, playerId: string): Promise<StartResponse> {
  return await $fetch('/api/game/restart', {
    method: 'POST',
    body: { gameId, playerId }
  })
}

/* ═══════════════════════════════════════════
   PLAYER ACTIONS
   ═══════════════════════════════════════════ */

export async function submitVote(
  gameId: string,
  playerId: string,
  targetId: string
): Promise<ActionResponse> {
  return await $fetch('/api/game/action', {
    method: 'POST',
    body: { gameId, playerId, actionType: 'vote', targetId }
  })
}

export async function submitNightAction(
  gameId: string,
  playerId: string,
  actionType: NightActionType,
  targetId?: string
): Promise<ActionResponse> {
  return await $fetch('/api/game/action', {
    method: 'POST',
    body: { gameId, playerId, actionType, targetId }
  })
}

export async function submitHunterAction(
  gameId: string,
  playerId: string,
  targetId: string
): Promise<ActionResponse> {
  return await $fetch('/api/game/action', {
    method: 'POST',
    body: { gameId, playerId, actionType: 'hunter_kill', targetId }
  })
}

export async function skipHunterAction(
  gameId: string,
  playerId: string
): Promise<ActionResponse> {
  return await $fetch('/api/game/action', {
    method: 'POST',
    body: { gameId, playerId, actionType: 'hunter_skip' }
  })
}

/* ═══════════════════════════════════════════
   ADMIN
   ═══════════════════════════════════════════ */

export async function adminDeleteGame(gameId: string): Promise<void> {
  await $fetch('/api/admin/delete-game', {
    method: 'POST',
    body: { gameId }
  })
}
