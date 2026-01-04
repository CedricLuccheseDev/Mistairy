import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../shared/types/database.types'
import type { Role, NightActionType } from '../../shared/types/game'

type GameClient = SupabaseClient<Database>
type Player = Database['public']['Tables']['players']['Row']

/* ═══════════════════════════════════════════
   ERROR HANDLING
   ═══════════════════════════════════════════ */

export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

function handleQueryError(error: unknown, operation: string): never {
  const message = error instanceof Error ? error.message : 'Unknown database error'
  console.error(`[Database] ${operation} failed:`, message)
  throw new DatabaseError(message, operation, error)
}

/* ═══════════════════════════════════════════
   PLAYER OPERATIONS
   ═══════════════════════════════════════════ */

export async function getPlayers(client: GameClient, gameId: string): Promise<Player[]> {
  const { data, error } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)

  if (error) handleQueryError(error, 'getPlayers')
  return data || []
}

export async function getAlivePlayers(client: GameClient, gameId: string): Promise<Player[]> {
  const { data, error } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_alive', true)

  if (error) handleQueryError(error, 'getAlivePlayers')
  return data || []
}

export async function getPlayersByRole(
  client: GameClient,
  gameId: string,
  role: Role
): Promise<Player[]> {
  const { data, error } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('role', role)

  if (error) handleQueryError(error, 'getPlayersByRole')
  return data || []
}

export async function getAlivePlayersByRole(
  client: GameClient,
  gameId: string,
  role: Role
): Promise<Player[]> {
  const { data, error } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('role', role)
    .eq('is_alive', true)

  if (error) handleQueryError(error, 'getAlivePlayersByRole')
  return data || []
}

export async function killPlayer(client: GameClient, playerId: string): Promise<Player | null> {
  const { data, error } = await client
    .from('players')
    .update({ is_alive: false })
    .eq('id', playerId)
    .select()
    .single()

  if (error) handleQueryError(error, 'killPlayer')
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

  // If tie, randomly pick one of the tied players
  if (topVoted.length > 1) {
    const randomIndex = Math.floor(Math.random() * topVoted.length)
    return {
      targetId: topVoted[randomIndex]![0],
      count: maxCount,
      isTie: true // Still mark as tie for narration purposes
    }
  }

  return {
    targetId: topVoted[0]![0],
    count: maxCount,
    isTie: false
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
  const { error } = await client.from('game_events').insert({
    game_id: gameId,
    event_type: eventType,
    message,
    data
  })

  if (error) handleQueryError(error, 'createGameEvent')
}

/* ═══════════════════════════════════════════
   NIGHT ACTIONS
   ═══════════════════════════════════════════ */

export async function getNightActions(
  client: GameClient,
  gameId: string,
  dayNumber: number
) {
  const { data, error } = await client
    .from('night_actions')
    .select('*')
    .eq('game_id', gameId)
    .eq('day_number', dayNumber)

  if (error) handleQueryError(error, 'getNightActions')
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
  // Use upsert with ON CONFLICT DO NOTHING to handle race conditions
  // Multiple clients may try to create the same action simultaneously
  const { error } = await client.from('night_actions').upsert(
    {
      game_id: gameId,
      day_number: dayNumber,
      player_id: playerId,
      action_type: actionType,
      target_id: targetId
    },
    {
      onConflict: 'game_id,day_number,player_id,action_type',
      ignoreDuplicates: true
    }
  )

  if (error) handleQueryError(error, 'createNightAction')
}

/* ═══════════════════════════════════════════
   DAY VOTES
   ═══════════════════════════════════════════ */

export async function getDayVotes(
  client: GameClient,
  gameId: string,
  dayNumber: number
) {
  const { data, error } = await client
    .from('day_votes')
    .select('*')
    .eq('game_id', gameId)
    .eq('day_number', dayNumber)

  if (error) handleQueryError(error, 'getDayVotes')
  return data || []
}

export async function createDayVote(
  client: GameClient,
  gameId: string,
  dayNumber: number,
  voterId: string,
  targetId: string
): Promise<void> {
  // Use upsert with ON CONFLICT DO NOTHING to handle race conditions
  const { error } = await client.from('day_votes').upsert(
    {
      game_id: gameId,
      day_number: dayNumber,
      voter_id: voterId,
      target_id: targetId
    },
    {
      onConflict: 'game_id,day_number,voter_id',
      ignoreDuplicates: true
    }
  )

  if (error) handleQueryError(error, 'createDayVote')
}
