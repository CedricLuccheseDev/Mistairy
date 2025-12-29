import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { Player, NightResult, NightAction } from './types'

export async function resolveNight(
  client: SupabaseClient<Database>,
  gameId: string,
  dayNumber: number,
  players: Player[]
): Promise<NightResult> {
  // Récupérer toutes les actions de la nuit
  const { data: actions } = await client
    .from('night_actions')
    .select('*')
    .eq('game_id', gameId)
    .eq('day_number', dayNumber)

  const result: NightResult = {
    killedByWolves: null,
    savedByWitch: false,
    killedByWitch: null,
    seerTarget: null
  }

  if (!actions) return result

  // Compter les votes des loups
  const werewolfVotes = actions.filter(a => a.action_type === 'werewolf_vote')
  const voteCounts = new Map<string, number>()

  for (const vote of werewolfVotes) {
    if (vote.target_id) {
      voteCounts.set(vote.target_id, (voteCounts.get(vote.target_id) || 0) + 1)
    }
  }

  // Trouver la victime des loups (majorité)
  let maxVotes = 0
  let wolfVictimId: string | null = null

  for (const [targetId, count] of voteCounts) {
    if (count > maxVotes) {
      maxVotes = count
      wolfVictimId = targetId
    }
  }

  if (wolfVictimId) {
    result.killedByWolves = players.find(p => p.id === wolfVictimId) || null
  }

  // Vérifier si la sorcière a sauvé
  const witchHeal = actions.find(a => a.action_type === 'witch_heal')
  if (witchHeal && witchHeal.target_id === wolfVictimId) {
    result.savedByWitch = true
    result.killedByWolves = null
  }

  // Vérifier si la sorcière a tué
  const witchKill = actions.find(a => a.action_type === 'witch_kill')
  if (witchKill && witchKill.target_id) {
    result.killedByWitch = players.find(p => p.id === witchKill.target_id) || null
  }

  // Récupérer la cible de la voyante
  const seerLook = actions.find(a => a.action_type === 'seer_look')
  if (seerLook && seerLook.target_id) {
    result.seerTarget = players.find(p => p.id === seerLook.target_id) || null
  }

  return result
}

export async function applyNightResult(
  client: SupabaseClient<Database>,
  gameId: string,
  result: NightResult
): Promise<Player[]> {
  const deadPlayers: Player[] = []

  // Tuer la victime des loups (si pas sauvée)
  if (result.killedByWolves) {
    await client
      .from('players')
      .update({ is_alive: false })
      .eq('id', result.killedByWolves.id)
    deadPlayers.push(result.killedByWolves)
  }

  // Tuer la victime de la sorcière
  if (result.killedByWitch) {
    await client
      .from('players')
      .update({ is_alive: false })
      .eq('id', result.killedByWitch.id)
    deadPlayers.push(result.killedByWitch)
  }

  return deadPlayers
}

export function getNightDeathMessage(deadPlayers: Player[]): string {
  if (deadPlayers.length === 0) {
    return 'Le village se réveille. Personne n\'est mort cette nuit.'
  }
  if (deadPlayers.length === 1) {
    return `Le village se réveille. ${deadPlayers[0].name} a été retrouvé mort cette nuit.`
  }
  const names = deadPlayers.map(p => p.name).join(' et ')
  return `Le village se réveille. ${names} ont été retrouvés morts cette nuit.`
}

export function hasEveryoneActed(
  actions: NightAction[],
  players: Player[],
  dayNumber: number
): boolean {
  const alivePlayers = players.filter(p => p.is_alive)
  const nightActions = actions.filter(a => a.day_number === dayNumber)

  // Vérifier que tous les loups ont voté
  const aliveWerewolves = alivePlayers.filter(p => p.role === 'werewolf')
  const werewolfVotes = nightActions.filter(a => a.action_type === 'werewolf_vote')
  if (werewolfVotes.length < aliveWerewolves.length) return false

  // Vérifier que la voyante a regardé (si vivante)
  const seer = alivePlayers.find(p => p.role === 'seer')
  if (seer) {
    const seerAction = nightActions.find(a => a.action_type === 'seer_look')
    if (!seerAction) return false
  }

  // La sorcière peut choisir de ne rien faire, donc on ne bloque pas sur elle

  return true
}
