/**
 * Centralized config exports
 * Import from '#shared/config' instead of individual files
 */

// Game configuration
export {
  MIN_PLAYERS,
  MAX_PLAYERS,
  DEFAULT_SETTINGS,
  calculateRoles,
  shuffleArray
} from './game.config'

// Role configuration
export {
  ROLES_CONFIG,
  NIGHT_ROLES_UI,
  getRoleConfig,
  getNightRoleUI,
  isValidActionForRole
} from './roles.config'
export type {
  Team,
  RoleConfig,
  RoleUIConfig,
  RoleNightConfig,
  NightRoleUIConfig
} from './roles.config'
