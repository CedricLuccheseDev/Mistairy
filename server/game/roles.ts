import type { Role } from './types'

export function calculateRoles(playerCount: number): Role[] {
  const roles: Role[] = []

  // Nombre de loups selon les joueurs
  const werewolfCount = playerCount <= 6 ? 1
    : playerCount <= 11 ? 2
      : playerCount <= 17 ? 3
        : 4

  // Ajouter les loups
  for (let i = 0; i < werewolfCount; i++) {
    roles.push('werewolf')
  }

  // Rôles spéciaux (toujours présents)
  roles.push('seer')
  roles.push('witch')

  // Chasseur si 7+ joueurs
  if (playerCount >= 7) {
    roles.push('hunter')
  }

  // Compléter avec des villageois
  while (roles.length < playerCount) {
    roles.push('villager')
  }

  return roles
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const ROLE_INFO: Record<Role, { name: string, team: 'village' | 'werewolf' }> = {
  werewolf: { name: 'Loup-Garou', team: 'werewolf' },
  villager: { name: 'Villageois', team: 'village' },
  seer: { name: 'Voyante', team: 'village' },
  witch: { name: 'Sorcière', team: 'village' },
  hunter: { name: 'Chasseur', team: 'village' }
}
