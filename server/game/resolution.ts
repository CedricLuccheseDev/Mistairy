/**
 * Night Resolution
 * Handles resolution of night actions (kills, saves, views)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../shared/types/database.types'
import type { Player, NightResult } from './types'
import * as db from '../services/database'

/**
 * Resolve all night actions and determine outcomes
 */
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

  // Count werewolf kills (majority vote among wolves)
  const wolfVotes = actions
    .filter(a => a.action_type === 'werewolf_kill' && a.target_id)
    .map(a => ({ target_id: a.target_id! }))

  const voteCounts = db.countVotes(wolfVotes)
  const { targetId: wolfVictimId } = db.findMajorityTarget(voteCounts)

  if (wolfVictimId) {
    result.killedByWolves = players.find(p => p.id === wolfVictimId) || null
  }

  // Witch save (cancels wolf kill)
  const witchHeal = actions.find(a => a.action_type === 'witch_save')
  if (witchHeal?.target_id === wolfVictimId) {
    result.savedByWitch = true
    result.killedByWolves = null
  }

  // Witch kill (independent of wolf kill)
  const witchKill = actions.find(a => a.action_type === 'witch_kill')
  if (witchKill?.target_id) {
    result.killedByWitch = players.find(p => p.id === witchKill.target_id) || null
  }

  // Seer view (just for tracking)
  const seerLook = actions.find(a => a.action_type === 'seer_view')
  if (seerLook?.target_id) {
    result.seerTarget = players.find(p => p.id === seerLook.target_id) || null
  }

  return result
}

/**
 * Apply night result by killing players
 * @returns List of dead players
 */
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

/**
 * Generate death announcement message
 */
export function getNightDeathMessage(dead: Player[]): string {
  if (dead.length === 0) {
    return 'Le village se réveille. Personne n\'est mort cette nuit.'
  }
  if (dead.length === 1) {
    return `Le village se réveille. ${dead[0]!.name} a été retrouvé mort cette nuit.`
  }
  return `Le village se réveille. ${dead.map(p => p.name).join(' et ')} ont été retrouvés morts cette nuit.`
}
