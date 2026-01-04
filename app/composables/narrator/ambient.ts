/**
 * Ambient Sound Configuration
 */

import type { AmbientSound } from './types'

// Ambient sound URLs
export const AMBIENT_SOUNDS: Record<AmbientSound, string> = {
  night: '/sounds/night.mp3',
  day: '/sounds/day.mp3',
  vote: '/sounds/night.mp3', // Reuse night for vote tension
  death: '/sounds/night.mp3',
  victory: '/sounds/day.mp3',
  defeat: '/sounds/night.mp3',
  suspense: '/sounds/night.mp3',
  transition: '/sounds/day.mp3',
  // Role-specific sounds
  witch: '/sounds/witch.mp3',
  seer: '/sounds/seer.mp3',
  werewolves: '/sounds/werewolves.mp3',
  hunter: '/sounds/hunter.mp3',
  // Day phase mood sounds
  happy: '/sounds/happy.mp3',
  sad: '/sounds/sad.mp3'
}
