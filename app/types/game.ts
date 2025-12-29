export type GameStatus = 'lobby' | 'night' | 'day' | 'vote' | 'finished'

export type Role = 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter'

export type NightActionType = 'werewolf_vote' | 'seer_look' | 'witch_heal' | 'witch_kill' | 'hunter_kill'

export interface Game {
  id: string
  code: string
  status: GameStatus
  phase_end_at: string | null
  day_number: number
  created_at: string
  host_id: string
  settings: GameSettings
}

export interface GameSettings {
  discussion_time: number
  vote_time: number
  night_time: number
}

export interface Player {
  id: string
  game_id: string
  name: string
  role: Role | null
  is_alive: boolean
  is_host: boolean
  created_at: string
  user_token: string
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

export function getMinPlayers(): number {
  return 5
}

export function getMaxPlayers(): number {
  return 18
}

export function calculateRoles(playerCount: number): Role[] {
  const roles: Role[] = []

  const werewolfCount = Math.max(1, Math.floor(playerCount / 4))

  for (let i = 0; i < werewolfCount; i++) {
    roles.push('werewolf')
  }

  roles.push('seer')

  if (playerCount >= 7) {
    roles.push('witch')
  }

  if (playerCount >= 9) {
    roles.push('hunter')
  }

  while (roles.length < playerCount) {
    roles.push('villager')
  }

  return roles
}
