import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { Player, VoteResult } from './types'

export async function resolveVotes(
  client: SupabaseClient<Database>,
  gameId: string,
  dayNumber: number,
  players: Player[]
): Promise<VoteResult> {
  const { data: votes } = await client
    .from('day_votes')
    .select('*')
    .eq('game_id', gameId)
    .eq('day_number', dayNumber)

  const voteCounts = new Map<string, number>()

  for (const vote of votes || []) {
    voteCounts.set(vote.target_id, (voteCounts.get(vote.target_id) || 0) + 1)
  }

  // Trouver le max de votes
  let maxVotes = 0
  let eliminated: Player | null = null
  let isTie = false

  const sortedVotes = Array.from(voteCounts.entries()).sort((a, b) => b[1] - a[1])

  if (sortedVotes.length > 0) {
    maxVotes = sortedVotes[0][1]
    const topVoted = sortedVotes.filter(([_, count]) => count === maxVotes)

    if (topVoted.length === 1) {
      eliminated = players.find(p => p.id === topVoted[0][0]) || null
    } else {
      isTie = true
    }
  }

  return { eliminated, isTie, votes: voteCounts }
}

export async function eliminatePlayer(
  client: SupabaseClient<Database>,
  player: Player
): Promise<void> {
  await client
    .from('players')
    .update({ is_alive: false })
    .eq('id', player.id)
}

export function getVoteResultMessage(result: VoteResult): string {
  if (result.isTie) {
    return 'Égalité ! Personne n\'est éliminé aujourd\'hui.'
  }
  if (!result.eliminated) {
    return 'Aucun vote n\'a été enregistré. Personne n\'est éliminé.'
  }
  return `${result.eliminated.name} a été éliminé par le village !`
}

export function hasEveryoneVoted(
  votes: { voter_id: string }[],
  players: Player[],
  dayNumber: number
): boolean {
  const alivePlayers = players.filter(p => p.is_alive)
  return votes.length >= alivePlayers.length
}
