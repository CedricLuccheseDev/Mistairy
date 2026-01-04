/**
 * Game Module - Clean exports
 *
 * Architecture (SOLID):
 * - types.ts    → Type definitions
 * - engine.ts   → Game state machine (phases, victory, transitions)
 * - actions.ts  → Player actions (vote, night, hunter)
 * - lobby.ts    → Lobby operations (create, join, leave, ready, start)
 *
 * Each layer has a single responsibility:
 * - API handlers: HTTP validation + routing
 * - Game module: Business logic
 * - Database module: Data persistence
 */

// Types
export * from './types'

// Engine - Game state machine
export {
  getDefaultSettings,
  getPhaseEndTime,
  checkVictory,
  getVictoryMessage,
  resolveNight,
  applyNightResult,
  getNightDeathMessage,
  hasNightEnded,
  transitionToDay,
  transitionToVote,
  transitionToNight,
  transitionToHunter,
  transitionAfterHunter,
  startDayDebate,
  startNightPhase,
  endGame
} from './engine'
export type { TransitionResult } from './engine'

// Actions - Player action handlers
export {
  submitVote,
  checkAndResolveVotes,
  submitNightAction,
  submitHunterAction
} from './actions'
export type { ActionResult } from './actions'

// Lobby - Lobby operations
export {
  createGame,
  joinGame,
  leaveGame,
  setPlayerReady,
  startGame,
  startNight,
  restartGame
} from './lobby'
export type {
  CreateGameResult,
  JoinGameResult,
  LeaveGameResult,
  ReadyResult,
  StartGameResult,
  StartNightResult,
  RestartGameResult
} from './lobby'

// Re-export utilities from config
export { calculateRoles, shuffleArray } from '../../shared/config/game.config'
export { isValidActionForRole, ROLES_CONFIG } from '../../shared/config/roles.config'
