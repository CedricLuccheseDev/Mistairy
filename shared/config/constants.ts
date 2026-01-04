/**
 * Game Constants
 * Named constants for magic numbers and durations
 */

/* ═══════════════════════════════════════════
   TIME DURATIONS (in milliseconds)
   ═══════════════════════════════════════════ */

/** Hunter phase duration: 30 seconds to choose a target */
export const HUNTER_PHASE_DURATION_MS = 30_000

/** Phase check interval: how often clients poll for phase transitions */
export const PHASE_CHECK_INTERVAL_MS = 2_000

/** Buffer time before phase end to trigger check */
export const PHASE_END_BUFFER_MS = 1_000

/** Delay after narration before proceeding */
export const NARRATION_DELAY_MS = 1_500
export const NARRATION_SHORT_DELAY_MS = 1_000

/* ═══════════════════════════════════════════
   PLAYER LIMITS
   ═══════════════════════════════════════════ */

/** Minimum players required to start a game */
export const MIN_PLAYERS_TO_START = 5

/* ═══════════════════════════════════════════
   GAME CODE
   ═══════════════════════════════════════════ */

/** Length of generated game codes */
export const GAME_CODE_LENGTH = 5

/** Characters used in game codes (excluding confusing ones like 0/O, 1/I) */
export const GAME_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/* ═══════════════════════════════════════════
   TTS & NARRATION
   ═══════════════════════════════════════════ */

/** Default speech rate for narration */
export const NARRATION_SPEECH_RATE = 0.85

/** Story voice type for immersive narration */
export const NARRATION_VOICE_TYPE = 'story' as const

/* ═══════════════════════════════════════════
   VALIDATION
   ═══════════════════════════════════════════ */

/** Maximum player name length */
export const MAX_PLAYER_NAME_LENGTH = 20

/** Minimum player name length */
export const MIN_PLAYER_NAME_LENGTH = 1

/** Game code pattern: 4-6 alphanumeric characters */
export const GAME_CODE_PATTERN = /^[A-Z0-9]{4,6}$/

/** UUID pattern for validation */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
