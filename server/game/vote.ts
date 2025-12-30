import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../shared/types/database.types'
import type { Player, VoteResult } from './types'
import { getDayVotes, countVotes, findMajorityTarget, killPlayer } from '../services/gameService'

export async function resolveVotes(
  client: SupabaseClient<Database>,
  gameId: string,
  dayNumber: number,
  players: Player[]
): Promise<VoteResult> {
  const votes = await getDayVotes(client, gameId, dayNumber)
  const voteCounts = countVotes(votes)
  const { targetId, isTie } = findMajorityTarget(voteCounts)

  const eliminated = targetId ? players.find(p => p.id === targetId) || null : null

  return { eliminated, isTie, votes: voteCounts }
}

export async function eliminatePlayer(
  client: SupabaseClient<Database>,
  player: Player
): Promise<void> {
  await killPlayer(client, player.id)
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
  _dayNumber: number
): boolean {
  const alivePlayers = players.filter(p => p.is_alive)
  return votes.length >= alivePlayers.length
}
