// ANSI color codes for terminal output
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  orange: '\x1b[38;5;208m',
  gray: '\x1b[90m',
  violet: '\x1b[38;5;135m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
}

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug'

const levelConfig: Record<LogLevel, { color: string; icon: string }> = {
  info: { color: c.blue, icon: '●' },
  success: { color: c.green, icon: '✓' },
  warn: { color: c.yellow, icon: '⚠' },
  error: { color: c.red, icon: '✗' },
  debug: { color: c.gray, icon: '·' }
}

// Game stats tracking
interface SessionStats {
  games: number
  narrations: number
  apiCalls: number
}

const sessionStats: SessionStats = {
  games: 0,
  narrations: 0,
  apiCalls: 0
}

function time(): string {
  return `${c.gray}${new Date().toLocaleTimeString('fr-FR')}${c.reset}`
}

function log(level: LogLevel, tag: string, message: string, data?: unknown): void {
  const cfg = levelConfig[level]
  const tagColors: Record<string, string> = {
    GAME: c.violet,
    PLAYER: c.cyan,
    PHASE: c.orange,
    VOTE: c.yellow,
    NIGHT: c.blue,
    NARR: c.magenta,
    AI: c.magenta,
    DB: c.green,
    API: c.gray
  }
  const tagColor = tagColors[tag] || c.cyan

  const line = `${time()} ${cfg.color}${cfg.icon}${c.reset} ${tagColor}${c.bold}${tag}${c.reset} ${message}`

  if (level === 'error') {
    console.error(line, data !== undefined ? data : '')
  }
  else if (level === 'warn') {
    console.warn(line, data !== undefined ? data : '')
  }
  else {
    console.log(line, data !== undefined ? data : '')
  }
}

function num(n: number, color = c.yellow): string {
  return `${color}${n.toLocaleString()}${c.reset}`
}

function code(gameCode: string): string {
  return `${c.bold}${c.violet}${gameCode}${c.reset}`
}

function playerStr(name: string): string {
  return `${c.cyan}${name}${c.reset}`
}

function role(roleName: string): string {
  const roleColors: Record<string, string> = {
    werewolf: c.red,
    seer: c.magenta,
    witch: c.green,
    hunter: c.orange,
    villager: c.blue
  }
  return `${roleColors[roleName] || c.gray}${roleName}${c.reset}`
}

export const logger = {
  info: (tag: string, message: string, data?: unknown) => log('info', tag, message, data),
  success: (tag: string, message: string, data?: unknown) => log('success', tag, message, data),
  warn: (tag: string, message: string, data?: unknown) => log('warn', tag, message, data),
  error: (tag: string, message: string, data?: unknown) => log('error', tag, message, data),
  debug: (tag: string, message: string, data?: unknown) => log('debug', tag, message, data),

  // Game operations
  game: {
    create: (gameCode: string) => {
      sessionStats.games++
      log('success', 'GAME', `Created ${code(gameCode)} ${c.dim}│${c.reset} Total: ${num(sessionStats.games, c.violet)}`)
    },
    start: (gameCode: string, playerCount: number) => {
      log('info', 'GAME', `${code(gameCode)} started with ${num(playerCount, c.cyan)} players`)
    },
    end: (gameCode: string, winner: 'village' | 'werewolf') => {
      const winColor = winner === 'village' ? c.green : c.red
      log('success', 'GAME', `${code(gameCode)} ended ${c.dim}│${c.reset} Winner: ${winColor}${winner}${c.reset}`)
    },
    delete: (gameCode: string) => {
      log('info', 'GAME', `${code(gameCode)} deleted`)
    },
    error: (gameCode: string, error: string) => log('error', 'GAME', `${code(gameCode)} ${error}`)
  },

  // Player operations
  player: {
    join: (gameCode: string, name: string, isHost: boolean) => {
      const hostBadge = isHost ? ` ${c.yellow}👑${c.reset}` : ''
      log('info', 'PLAYER', `${playerStr(name)}${hostBadge} joined ${code(gameCode)}`)
    },
    leave: (gameCode: string, name: string) => {
      log('info', 'PLAYER', `${playerStr(name)} left ${code(gameCode)}`)
    },
    role: (gameCode: string, name: string, roleName: string) => {
      log('debug', 'PLAYER', `${playerStr(name)} → ${role(roleName)} in ${code(gameCode)}`)
    },
    death: (gameCode: string, name: string, cause: string) => {
      log('warn', 'PLAYER', `${c.red}💀${c.reset} ${playerStr(name)} died (${cause}) in ${code(gameCode)}`)
    }
  },

  // Phase transitions
  phase: {
    change: (gameCode: string, from: string, to: string, dayNumber: number) => {
      const phaseColors: Record<string, string> = {
        lobby: c.gray,
        night: c.blue,
        day: c.yellow,
        vote: c.orange,
        hunter: c.red,
        finished: c.green
      }
      const fromColor = phaseColors[from] || c.gray
      const toColor = phaseColors[to] || c.gray
      log('info', 'PHASE', `${code(gameCode)} ${fromColor}${from}${c.reset} → ${toColor}${to}${c.reset} ${c.dim}│${c.reset} Day ${num(dayNumber, c.cyan)}`)
    }
  },

  // Night actions
  night: {
    action: (gameCode: string, playerName: string, action: string, target?: string) => {
      const targetStr = target ? ` → ${playerStr(target)}` : ''
      log('debug', 'NIGHT', `${code(gameCode)} ${playerStr(playerName)} ${c.dim}${action}${c.reset}${targetStr}`)
    },
    werewolfVote: (gameCode: string, voterName: string, targetName: string) => {
      log('debug', 'NIGHT', `${code(gameCode)} ${c.red}🐺${c.reset} ${playerStr(voterName)} votes ${playerStr(targetName)}`)
    },
    seerLook: (gameCode: string, targetName: string, targetRole: string) => {
      log('debug', 'NIGHT', `${code(gameCode)} ${c.magenta}🔮${c.reset} sees ${playerStr(targetName)} is ${role(targetRole)}`)
    },
    witchUse: (gameCode: string, potion: 'life' | 'death', targetName: string) => {
      const icon = potion === 'life' ? `${c.green}💚${c.reset}` : `${c.red}💀${c.reset}`
      log('debug', 'NIGHT', `${code(gameCode)} ${c.green}🧪${c.reset} ${icon} ${playerStr(targetName)}`)
    }
  },

  // Vote operations
  vote: {
    cast: (gameCode: string, voterName: string, targetName: string) => {
      log('debug', 'VOTE', `${code(gameCode)} ${playerStr(voterName)} → ${playerStr(targetName)}`)
    },
    result: (gameCode: string, eliminatedName: string | null, voteCount: number) => {
      if (eliminatedName) {
        log('info', 'VOTE', `${code(gameCode)} ${playerStr(eliminatedName)} eliminated (${num(voteCount)} votes)`)
      }
      else {
        log('info', 'VOTE', `${code(gameCode)} No elimination (tie or no votes)`)
      }
    }
  },

  // Narration / AI
  narration: {
    generate: (context: string, hasApiKey: boolean) => {
      sessionStats.narrations++
      if (hasApiKey) {
        sessionStats.apiCalls++
        log('debug', 'NARR', `Generating ${c.cyan}${context}${c.reset} via AI`)
      }
      else {
        log('debug', 'NARR', `Using fallback for ${c.cyan}${context}${c.reset}`)
      }
    },
    batch: (contexts: string[], hasApiKey: boolean) => {
      sessionStats.narrations += contexts.length
      if (hasApiKey) {
        sessionStats.apiCalls++
        log('debug', 'NARR', `Batch ${num(contexts.length, c.cyan)} narrations via AI`)
      }
      else {
        log('debug', 'NARR', `Batch ${num(contexts.length, c.cyan)} fallbacks`)
      }
    },
    error: (error: string) => log('error', 'NARR', error)
  },

  // Helpers
  c,
  num,
  code,
  playerStr,
  role,

  // Get session stats
  getStats: () => ({ ...sessionStats })
}
