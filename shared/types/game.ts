import type { GameSettings } from './database.types'

// Game status enum
export const GameStatus = {
  Lobby: 'lobby',
  NightIntro: 'night_intro',
  Night: 'night',
  DayIntro: 'day_intro',
  Day: 'day',
  Vote: 'vote',
  VoteResult: 'vote_result',
  Hunter: 'hunter',
  Finished: 'finished'
} as const
export type GameStatus = typeof GameStatus[keyof typeof GameStatus]

// Hunter death context (where did hunter die)
export type HunterDiedAt = 'night' | 'vote' | null

// Role enum
export const Role = {
  Werewolf: 'werewolf',
  Villager: 'villager',
  Seer: 'seer',
  Witch: 'witch',
  Hunter: 'hunter'
} as const
export type Role = typeof Role[keyof typeof Role]

// Night action type enum
export const NightActionType = {
  WerewolfKill: 'werewolf_kill',
  WerewolfSkip: 'werewolf_skip',
  SeerView: 'seer_view',
  SeerSkip: 'seer_skip',
  WitchSave: 'witch_save',
  WitchKill: 'witch_kill',
  WitchSkip: 'witch_skip',
  HunterKill: 'hunter_kill',
  HunterSkip: 'hunter_skip'
} as const
export type NightActionType = typeof NightActionType[keyof typeof NightActionType]

// Night role enum (roles that act at night)
export const NightRole = {
  Seer: 'seer',
  Werewolf: 'werewolf',
  Witch: 'witch'
} as const
export type NightRole = typeof NightRole[keyof typeof NightRole]

export interface Game {
  id: string
  code: string
  status: GameStatus
  phase_end_at: string | null
  day_number: number
  winner: 'village' | 'werewolf' | null
  created_at: string
  host_id: string | null
  settings: GameSettings
  hunter_target_pending: string | null
  hunter_died_at: HunterDiedAt
  current_night_role: NightRole | null
  narration_text: string | null
}

export interface Player {
  id: string
  game_id: string
  name: string
  role: Role | null
  is_alive: boolean
  is_host: boolean
  witch_heal_used: boolean
  witch_kill_used: boolean
  created_at: string
  user_token?: string
}

export interface NightAction {
  id: string
  game_id: string
  day_number: number
  player_id: string
  action_type: NightActionType
  target_id: string | null
  created_at: string
}

export interface DayVote {
  id: string
  game_id: string
  day_number: number
  voter_id: string
  target_id: string
  created_at: string
}

export interface GameEvent {
  id: string
  game_id: string
  event_type: string
  message: string
  data: Record<string, unknown>
  created_at: string
}

// Re-export from centralized config
export { MIN_PLAYERS, MAX_PLAYERS, calculateRoles } from '../config/game.config'
export { ROLES_CONFIG, getRoleConfig } from '../config/roles.config'
export type { RoleConfig, Team } from '../config/roles.config'
