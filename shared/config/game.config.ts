import type { Role } from '../types/game'
import type { GameSettings } from '../types/database.types'

// Player limits
export const MIN_PLAYERS = 5
export const MAX_PLAYERS = 18

// Default phase settings (in seconds)
export const DEFAULT_SETTINGS: GameSettings = {
  night_time: 30,
  discussion_time: 120,
  vote_time: 60,
  max_players: MAX_PLAYERS,
  narration_enabled: true,
  roles: {
    seer: true,
    witch: true,
    hunter: true
  }
}


// Valid actions per role
export const ROLE_ACTIONS: Record<string, string[]> = {
  werewolf: ['werewolf_kill'],
  seer: ['seer_view'],
  witch: ['witch_save', 'witch_kill', 'witch_skip'],
  hunter: ['hunter_kill', 'hunter_skip']
} as const

// Role info with display name and team
export const ROLE_INFO: Record<Role, { name: string; team: 'village' | 'werewolf' }> = {
  werewolf: { name: 'Loup-Garou', team: 'werewolf' },
  villager: { name: 'Villageois', team: 'village' },
  seer: { name: 'Voyante', team: 'village' },
  witch: { name: 'Sorcière', team: 'village' },
  hunter: { name: 'Chasseur', team: 'village' }
}

// Calculate roles based on player count and settings
export function calculateRoles(playerCount: number, settings?: GameSettings): Role[] {
  const roles: Role[] = []
  const roleSettings = settings?.roles || DEFAULT_SETTINGS.roles

  // Werewolf count based on player count
  const werewolfCount = playerCount <= 6 ? 1
    : playerCount <= 11 ? 2
      : playerCount <= 17 ? 3
        : 4

  // Add werewolves
  for (let i = 0; i < werewolfCount; i++) {
    roles.push('werewolf')
  }

  // Special roles (only if enabled in settings)
  if (roleSettings.seer) roles.push('seer')
  if (roleSettings.witch) roles.push('witch')
  if (roleSettings.hunter && playerCount >= 7) roles.push('hunter')

  // Fill remaining with villagers
  while (roles.length < playerCount) {
    roles.push('villager')
  }

  return roles
}

// Shuffle array utility (Fisher-Yates)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]!
    shuffled[j] = temp!
  }
  return shuffled
}
