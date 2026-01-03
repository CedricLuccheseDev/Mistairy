/**
 * Narrator Types
 * All types and interfaces for the narrator system
 */

export type NarrationContext =
  | 'night_start'
  | 'werewolves_wake'
  | 'werewolves_done'
  | 'seer_wake'
  | 'seer_done'
  | 'witch_wake'
  | 'witch_done'
  | 'day_start'
  | 'death_announce'
  | 'vote_start'
  | 'vote_result'
  | 'hunter_death'
  | 'game_end'

export interface NarrationData {
  victimName?: string
  killedBy?: 'werewolves' | 'witch' | 'hunter' | 'village'
  winner?: 'village' | 'werewolf'
  dayNumber?: number
  playerCount?: number
  aliveCount?: number
  playerNames?: string[]
}

export interface BatchContext {
  context: NarrationContext
  data?: NarrationData
}

export interface BatchResponse {
  narrations: Record<NarrationContext, string>
  storyTheme: string
}

export interface TTSResponse {
  success: boolean
  audio?: string
  contentType?: string
  useFallback?: boolean
  message?: string
}

// Voice types: 'story' for atmospheric narration, 'event' for game announcements
export type VoiceType = 'story' | 'event'

export type AmbientSound = 'night' | 'day' | 'vote' | 'death' | 'victory' | 'defeat' | 'suspense' | 'transition'
