import type { GameSettings } from './database.types'

export type GameStatus = 'lobby' | 'intro' | 'night' | 'day' | 'vote' | 'hunter' | 'finished'

export type Role = 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter'

export type NightActionType = 'werewolf_kill' | 'werewolf_skip' | 'seer_view' | 'seer_skip' | 'witch_save' | 'witch_kill' | 'witch_skip' | 'hunter_kill' | 'hunter_skip'

export type NightRole = 'seer' | 'werewolf' | 'witch'

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
  hunter_target_pending?: string | null
  current_night_role?: NightRole | null
}

export interface Player {
  id: string
  game_id: string
  name: string
  role: Role | null
  is_alive: boolean
  is_host: boolean
  witch_heal_used?: boolean
  witch_kill_used?: boolean
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

export interface RoleInfo {
  role: Role
  name: string
  emoji: string
  description: string
  team: 'village' | 'werewolf'
}

export const ROLES: Record<Role, RoleInfo> = {
  werewolf: {
    role: 'werewolf',
    name: 'Loup-Garou',
    emoji: '🐺',
    description: 'Chaque nuit, dévore un villageois avec les autres loups.',
    team: 'werewolf'
  },
  villager: {
    role: 'villager',
    name: 'Villageois',
    emoji: '👤',
    description: 'Tu n\'as pas de pouvoir spécial, mais ton vote est crucial.',
    team: 'village'
  },
  seer: {
    role: 'seer',
    name: 'Voyante',
    emoji: '🔮',
    description: 'Chaque nuit, tu peux découvrir le rôle d\'un joueur.',
    team: 'village'
  },
  witch: {
    role: 'witch',
    name: 'Sorcière',
    emoji: '🧪',
    description: 'Tu possèdes une potion de vie et une potion de mort (usage unique).',
    team: 'village'
  },
  hunter: {
    role: 'hunter',
    name: 'Chasseur',
    emoji: '🏹',
    description: 'Si tu meurs, tu peux emporter quelqu\'un avec toi.',
    team: 'village'
  }
}

export function getRoleInfo(role: Role): RoleInfo {
  return ROLES[role]
}

// Re-export from centralized config
export { MIN_PLAYERS, MAX_PLAYERS, calculateRoles } from '../config/game.config'
