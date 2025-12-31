import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../shared/types/database.types'
import type { Role, NightActionType } from '../../shared/types/game'

type GameClient = SupabaseClient<Database>
type Player = Database['public']['Tables']['players']['Row']

/* ═══════════════════════════════════════════
   PLAYER OPERATIONS
   ═══════════════════════════════════════════ */

export async function getPlayers(client: GameClient, gameId: string): Promise<Player[]> {
  const { data } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)

  return data || []
}

export async function getAlivePlayers(client: GameClient, gameId: string): Promise<Player[]> {
  const { data } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_alive', true)

  return data || []
}

export async function getPlayersByRole(
  client: GameClient,
  gameId: string,
  role: Role
): Promise<Player[]> {
  const { data } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('role', role)

  return data || []
}

export async function getAlivePlayersByRole(
  client: GameClient,
  gameId: string,
  role: Role
): Promise<Player[]> {
  const { data } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('role', role)
    .eq('is_alive', true)

  return data || []
}

export async function killPlayer(client: GameClient, playerId: string): Promise<Player | null> {
  const { data } = await client
    .from('players')
    .update({ is_alive: false })
    .eq('id', playerId)
    .select()
    .single()

  return data
}

/* ═══════════════════════════════════════════
   VOTE OPERATIONS
   ═══════════════════════════════════════════ */

export function countVotes(votes: { target_id: string }[]): Map<string, number> {
  const voteCounts = new Map<string, number>()

  for (const vote of votes) {
    voteCounts.set(vote.target_id, (voteCounts.get(vote.target_id) || 0) + 1)
  }

  return voteCounts
}

export function findMajorityTarget(voteCounts: Map<string, number>): {
  targetId: string | null
  count: number
  isTie: boolean
} {
  if (voteCounts.size === 0) {
    return { targetId: null, count: 0, isTie: false }
  }

  const sorted = Array.from(voteCounts.entries()).sort((a, b) => b[1] - a[1])
  const maxCount = sorted[0]![1]
  const topVoted = sorted.filter(([, count]) => count === maxCount)

  return {
    targetId: topVoted.length === 1 ? topVoted[0]![0] : null,
    count: maxCount,
    isTie: topVoted.length > 1
  }
}

/* ═══════════════════════════════════════════
   GAME EVENTS
   ═══════════════════════════════════════════ */

export async function createGameEvent(
  client: GameClient,
  gameId: string,
  eventType: string,
  message: string,
  data: Json = {}
): Promise<void> {
  await client.from('game_events').insert({
    game_id: gameId,
    event_type: eventType,
    message,
    data
  })
}

/* ═══════════════════════════════════════════
   NIGHT ACTIONS
   ═══════════════════════════════════════════ */

export async function getNightActions(
  client: GameClient,
  gameId: string,
  dayNumber: number
) {
  const { data } = await client
    .from('night_actions')
    .select('*')
    .eq('game_id', gameId)
    .eq('day_number', dayNumber)

  return data || []
}

export async function createNightAction(
  client: GameClient,
  gameId: string,
  dayNumber: number,
  playerId: string,
  actionType: NightActionType,
  targetId: string | null
): Promise<void> {
  await client.from('night_actions').insert({
    game_id: gameId,
    day_number: dayNumber,
    player_id: playerId,
    action_type: actionType,
    target_id: targetId
  })
}

/* ═══════════════════════════════════════════
   DAY VOTES
   ═══════════════════════════════════════════ */

export async function getDayVotes(
  client: GameClient,
  gameId: string,
  dayNumber: number
) {
  const { data } = await client
    .from('day_votes')
    .select('*')
    .eq('game_id', gameId)
    .eq('day_number', dayNumber)

  return data || []
}

export async function createDayVote(
  client: GameClient,
  gameId: string,
  dayNumber: number,
  voterId: string,
  targetId: string
): Promise<void> {
  await client.from('day_votes').insert({
    game_id: gameId,
    day_number: dayNumber,
    voter_id: voterId,
    target_id: targetId
  })
}
