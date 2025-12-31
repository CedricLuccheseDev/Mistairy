import type { Database } from '../../shared/types/database.types'

export type Game = Database['public']['Tables']['games']['Row']
export type Player = Database['public']['Tables']['players']['Row']
export type NightAction = Database['public']['Tables']['night_actions']['Row']
export type DayVote = Database['public']['Tables']['day_votes']['Row']
export type GameEvent = Database['public']['Tables']['game_events']['Row']

export type GameStatus = Game['status']
export type Role = NonNullable<Player['role']>
export type ActionType = NightAction['action_type']
export type NightRole = NonNullable<Game['current_night_role']>

export interface GameContext {
  game: Game
  players: Player[]
  dayNumber: number
}

export interface NightResult {
  killedByWolves: Player | null
  savedByWitch: boolean
  killedByWitch: Player | null
  seerTarget: Player | null
}

export interface VoteResult {
  eliminated: Player | null
  isTie: boolean
  votes: Map<string, number>
}

export type Winner = 'village' | 'werewolf' | null
