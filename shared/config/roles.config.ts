/**
 * Centralized Role Configuration
 * Single source of truth for all role-related data
 */

import type { Role, NightRole, NightActionType } from '../types/game'

export type Team = 'village' | 'werewolf'

export interface RoleUIConfig {
  color: string           // Tailwind color name: 'red', 'violet', 'emerald'
  textColor: string       // CSS class: 'text-red-400'
  bgColor: string         // CSS class: 'bg-red-950/50'
  borderColor: string     // CSS class: 'border-red-500/30'
  glowColor: string       // RGBA for radial gradient
}

export interface RoleNightConfig {
  wakeMessage: string     // Narrator text when role wakes
  actionPrompt: string    // Text shown in action UI
  actionDescription: string // Short description of what they're doing
}

export interface RoleConfig {
  id: Role
  name: string
  emoji: string
  description: string
  team: Team
  actions: NightActionType[]
  ui: RoleUIConfig
  night: RoleNightConfig | null   // null for roles without night actions (villager)
}

/**
 * Complete role configuration
 * Contains all display, gameplay, and UI information for each role
 */
export const ROLES_CONFIG: Record<Role, RoleConfig> = {
  werewolf: {
    id: 'werewolf',
    name: 'Loup-Garou',
    emoji: '🐺',
    description: 'Chaque nuit, dévore un villageois avec les autres loups.',
    team: 'werewolf',
    actions: ['werewolf_kill'],
    ui: {
      color: 'red',
      textColor: 'text-red-400',
      bgColor: 'bg-red-950/50',
      borderColor: 'border-red-500/30',
      glowColor: 'rgba(239, 68, 68, 0.5)'
    },
    night: {
      wakeMessage: 'Les loups-garous se réveillent et choisissent leur victime...',
      actionPrompt: 'Choisissez votre victime',
      actionDescription: 'choisissent leur victime...'
    }
  },

  villager: {
    id: 'villager',
    name: 'Villageois',
    emoji: '👤',
    description: 'Tu n\'as pas de pouvoir spécial, mais ton vote est crucial.',
    team: 'village',
    actions: [],
    ui: {
      color: 'gray',
      textColor: 'text-neutral-400',
      bgColor: 'bg-neutral-900/50',
      borderColor: 'border-neutral-500/30',
      glowColor: 'rgba(163, 163, 163, 0.3)'
    },
    night: null
  },

  seer: {
    id: 'seer',
    name: 'Voyante',
    emoji: '🔮',
    description: 'Chaque nuit, tu peux découvrir le rôle d\'un joueur.',
    team: 'village',
    actions: ['seer_view'],
    ui: {
      color: 'violet',
      textColor: 'text-violet-400',
      bgColor: 'bg-violet-950/50',
      borderColor: 'border-violet-500/30',
      glowColor: 'rgba(139, 92, 246, 0.5)'
    },
    night: {
      wakeMessage: 'La voyante se réveille et consulte les esprits...',
      actionPrompt: 'Découvrez un rôle',
      actionDescription: 'observe le village...'
    }
  },

  witch: {
    id: 'witch',
    name: 'Sorcière',
    emoji: '🧪',
    description: 'Tu possèdes une potion de vie et une potion de mort (usage unique).',
    team: 'village',
    actions: ['witch_save', 'witch_kill', 'witch_skip'],
    ui: {
      color: 'emerald',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-950/50',
      borderColor: 'border-emerald-500/30',
      glowColor: 'rgba(16, 185, 129, 0.5)'
    },
    night: {
      wakeMessage: 'La sorcière se réveille et prépare ses potions...',
      actionPrompt: 'Utilisez vos potions',
      actionDescription: 'prépare ses potions...'
    }
  },

  hunter: {
    id: 'hunter',
    name: 'Chasseur',
    emoji: '🏹',
    description: 'Si tu meurs, tu peux emporter quelqu\'un avec toi.',
    team: 'village',
    actions: ['hunter_kill', 'hunter_skip'],
    ui: {
      color: 'amber',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-950/50',
      borderColor: 'border-amber-500/30',
      glowColor: 'rgba(245, 158, 11, 0.5)'
    },
    night: null   // Hunter acts on death, not during night phase
  }
}

/**
 * Night role UI configuration (for roles that wake at night)
 * Used by NightPhase.vue and NightRoleIndicator.vue
 */
export interface NightRoleUIConfig {
  icon: string
  label: string
  action: string
  color: string
  textColor: string
  bgColor: string
  borderColor: string
  glowColor: string
}

export const NIGHT_ROLES_UI: Record<NightRole | 'waiting', NightRoleUIConfig> = {
  seer: {
    icon: ROLES_CONFIG.seer.emoji,
    label: 'La Voyante',
    action: ROLES_CONFIG.seer.night!.actionDescription,
    color: ROLES_CONFIG.seer.ui.color,
    textColor: ROLES_CONFIG.seer.ui.textColor,
    bgColor: ROLES_CONFIG.seer.ui.bgColor,
    borderColor: ROLES_CONFIG.seer.ui.borderColor,
    glowColor: ROLES_CONFIG.seer.ui.glowColor
  },
  werewolf: {
    icon: ROLES_CONFIG.werewolf.emoji,
    label: 'Les Loups-Garous',
    action: ROLES_CONFIG.werewolf.night!.actionDescription,
    color: ROLES_CONFIG.werewolf.ui.color,
    textColor: ROLES_CONFIG.werewolf.ui.textColor,
    bgColor: ROLES_CONFIG.werewolf.ui.bgColor,
    borderColor: ROLES_CONFIG.werewolf.ui.borderColor,
    glowColor: ROLES_CONFIG.werewolf.ui.glowColor
  },
  witch: {
    icon: ROLES_CONFIG.witch.emoji,
    label: 'La Sorcière',
    action: ROLES_CONFIG.witch.night!.actionDescription,
    color: ROLES_CONFIG.witch.ui.color,
    textColor: ROLES_CONFIG.witch.ui.textColor,
    bgColor: ROLES_CONFIG.witch.ui.bgColor,
    borderColor: ROLES_CONFIG.witch.ui.borderColor,
    glowColor: ROLES_CONFIG.witch.ui.glowColor
  },
  waiting: {
    icon: '🌙',
    label: 'La nuit...',
    action: 'Le village dort',
    color: 'violet',
    textColor: 'text-violet-400',
    bgColor: 'bg-violet-950/50',
    borderColor: 'border-violet-500/30',
    glowColor: 'rgba(139, 92, 246, 0.3)'
  }
}

/**
 * Helper function to get role configuration
 */
export function getRoleConfig(role: Role): RoleConfig {
  return ROLES_CONFIG[role]
}

/**
 * Helper function to get night role UI config
 */
export function getNightRoleUI(role: NightRole | 'waiting' | null): NightRoleUIConfig {
  return NIGHT_ROLES_UI[role || 'waiting']
}

/**
 * Check if an action is valid for a role
 */
export function isValidActionForRole(role: Role, actionType: string): boolean {
  const config = ROLES_CONFIG[role]
  return config.actions.includes(actionType as NightActionType)
}
