/**
 * API Validation Schemas
 * Zod-like validation for API endpoints
 */

/* ═══════════════════════════════════════════
   VALIDATION UTILITIES
   ═══════════════════════════════════════════ */

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateString(value: unknown, field: string, options?: {
  minLength?: number
  maxLength?: number
  pattern?: RegExp
}): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`, field)
  }

  const trimmed = value.trim()

  if (options?.minLength && trimmed.length < options.minLength) {
    throw new ValidationError(`${field} must be at least ${options.minLength} characters`, field)
  }

  if (options?.maxLength && trimmed.length > options.maxLength) {
    throw new ValidationError(`${field} must be at most ${options.maxLength} characters`, field)
  }

  if (options?.pattern && !options.pattern.test(trimmed)) {
    throw new ValidationError(`${field} format is invalid`, field)
  }

  return trimmed
}

export function validateUUID(value: unknown, field: string): string {
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`, field)
  }

  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError(`${field} must be a valid UUID`, field)
  }

  return value
}

export function validateEnum<T extends string>(
  value: unknown,
  field: string,
  allowedValues: readonly T[]
): T {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`, field)
  }

  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(`${field} must be one of: ${allowedValues.join(', ')}`, field)
  }

  return value as T
}

export function validateOptional<T>(
  value: unknown,
  validator: (v: unknown) => T
): T | null {
  if (value === undefined || value === null) {
    return null
  }
  return validator(value)
}

/* ═══════════════════════════════════════════
   GAME-SPECIFIC VALIDATORS
   ═══════════════════════════════════════════ */

const GAME_CODE_PATTERN = /^[A-Z0-9]{4,6}$/

export function validateGameCode(value: unknown): string {
  const code = validateString(value, 'code', { minLength: 4, maxLength: 6 })
  if (!GAME_CODE_PATTERN.test(code.toUpperCase())) {
    throw new ValidationError('code must be 4-6 alphanumeric characters', 'code')
  }
  return code.toUpperCase()
}

export function validatePlayerName(value: unknown): string {
  return validateString(value, 'playerName', { minLength: 1, maxLength: 20 })
}

export function validateGameId(value: unknown): string {
  return validateUUID(value, 'gameId')
}

export function validatePlayerId(value: unknown): string {
  return validateUUID(value, 'playerId')
}

export function validateTargetId(value: unknown): string | null {
  return validateOptional(value, v => validateUUID(v, 'targetId'))
}

const ACTION_TYPES = [
  'werewolf_kill',
  'werewolf_skip',
  'seer_view',
  'seer_skip',
  'witch_save',
  'witch_kill',
  'witch_skip',
  'hunter_shoot'
] as const

export type ActionType = typeof ACTION_TYPES[number]

export function validateActionType(value: unknown): ActionType {
  return validateEnum(value, 'actionType', ACTION_TYPES)
}

/* ═══════════════════════════════════════════
   REQUEST VALIDATORS
   ═══════════════════════════════════════════ */

export interface JoinGameRequest {
  code: string
  playerName: string
}

export function validateJoinGameRequest(body: unknown): JoinGameRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body is required')
  }

  const data = body as Record<string, unknown>

  return {
    code: validateGameCode(data.code),
    playerName: validatePlayerName(data.playerName)
  }
}

export interface ActionRequest {
  gameId: string
  playerId: string
  actionType: ActionType
  targetId: string | null
}

export function validateActionRequest(body: unknown): ActionRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body is required')
  }

  const data = body as Record<string, unknown>

  return {
    gameId: validateGameId(data.gameId),
    playerId: validatePlayerId(data.playerId),
    actionType: validateActionType(data.actionType),
    targetId: validateTargetId(data.targetId)
  }
}

export interface GameRequest {
  gameId: string
  playerId: string
}

export function validateGameRequest(body: unknown): GameRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body is required')
  }

  const data = body as Record<string, unknown>

  return {
    gameId: validateGameId(data.gameId),
    playerId: validatePlayerId(data.playerId)
  }
}
