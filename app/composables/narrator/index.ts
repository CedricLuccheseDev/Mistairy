/**
 * Narrator Module Index
 * Re-exports all narrator functionality
 */

export * from './types'
export { getDefaultMessage, getVoiceTypeForContext, LEGACY_MESSAGES } from './messages.config'
export { stripSSML, findBestFrenchVoice, createTTSController } from './tts'
export { AMBIENT_SOUNDS, createAmbientController } from './ambient'
