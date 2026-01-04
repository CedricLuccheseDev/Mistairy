<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { ROLES_CONFIG } from '#shared/config/roles.config'
import type { Role } from '#shared/types/game'

type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = withDefaults(defineProps<{
  targets: Player[]
  disabled?: boolean
  loading?: boolean
  color?: 'red' | 'violet' | 'amber' | 'orange' | 'emerald'
  selectedId?: string | null
  currentPlayer?: Player | null
  recognizedPlayerIds?: string[] // IDs of players whose role should be shown (e.g. other werewolves)
}>(), {
  disabled: false,
  loading: false,
  color: 'violet',
  selectedId: null,
  currentPlayer: null,
  recognizedPlayerIds: () => []
})

/* --- Helpers --- */
function getPlayerIcon(target: Player): string {
  // Show role icon for current player
  if (props.currentPlayer && target.id === props.currentPlayer.id && target.role) {
    return ROLES_CONFIG[target.role as Role]?.emoji || '👤'
  }
  // Show role icon for recognized players (e.g. werewolves see each other)
  if (props.recognizedPlayerIds.includes(target.id) && target.role) {
    return ROLES_CONFIG[target.role as Role]?.emoji || '👤'
  }
  return '👤'
}

/* --- Emits --- */
const emit = defineEmits<{
  select: [player: Player]
}>()

/* --- Computed --- */
const colorClasses = computed(() => {
  const colors = {
    red: {
      bg: 'from-red-950/80 to-red-900/40',
      border: 'border-red-500/30 hover:border-red-500/60',
      glow: 'hover:shadow-red-500/20',
      text: 'text-red-400',
      ring: 'ring-red-500'
    },
    violet: {
      bg: 'from-violet-950/80 to-violet-900/40',
      border: 'border-violet-500/30 hover:border-violet-500/60',
      glow: 'hover:shadow-violet-500/20',
      text: 'text-violet-400',
      ring: 'ring-violet-500'
    },
    amber: {
      bg: 'from-amber-950/80 to-amber-900/40',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      glow: 'hover:shadow-amber-500/20',
      text: 'text-amber-400',
      ring: 'ring-amber-500'
    },
    orange: {
      bg: 'from-orange-950/80 to-orange-900/40',
      border: 'border-orange-500/30 hover:border-orange-500/60',
      glow: 'hover:shadow-orange-500/20',
      text: 'text-orange-400',
      ring: 'ring-orange-500'
    },
    emerald: {
      bg: 'from-emerald-950/80 to-emerald-900/40',
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      glow: 'hover:shadow-emerald-500/20',
      text: 'text-emerald-400',
      ring: 'ring-emerald-500'
    }
  }
  return colors[props.color]
})

/* --- Methods --- */
function selectTarget(player: Player) {
  if (props.disabled || props.loading) return
  emit('select', player)
}
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5 w-full">
    <button
      v-for="(target, index) in targets"
      :key="target.id"
      :style="{ animationDelay: `${index * 60}ms` }"
      class="animate-slide-up-stagger group relative"
      :disabled="disabled || loading"
      @click="selectTarget(target)"
    >
      <!-- Card Container -->
      <div
        class="relative flex flex-col items-center p-5 sm:p-6 rounded-2xl border-2 bg-gradient-to-br backdrop-blur-sm transition-all duration-300 overflow-hidden min-h-[140px] sm:min-h-[160px]"
        :class="[
          colorClasses.bg,
          colorClasses.border,
          colorClasses.glow,
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]',
          selectedId === target.id ? `ring-2 ${colorClasses.ring}` : ''
        ]"
      >
        <!-- Avatar Circle -->
        <div
          class="relative w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-white/10 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
        >
          <!-- Avatar Icon -->
          <span class="text-5xl sm:text-6xl">{{ getPlayerIcon(target) }}</span>

          <!-- Hover Glow Ring -->
          <div
            class="absolute inset-0 rounded-full border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-border-pulse"
            :class="colorClasses.border"
          />
        </div>

        <!-- Player Name -->
        <p class="text-white font-bold text-base sm:text-lg text-center truncate w-full px-2">
          {{ target.name }}
        </p>

        <!-- Selection Indicator -->
        <div
          v-if="selectedId === target.id"
          class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center animate-check-pop"
        >
          <span class="text-sm">✓</span>
        </div>

        <!-- Hover Overlay Effect -->
        <div
          class="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        />

        <!-- Loading shimmer -->
        <div
          v-if="loading"
          class="absolute inset-0 animate-shimmer pointer-events-none"
        />
      </div>
    </button>

    <!-- Loading indicator -->
    <div
      v-if="loading"
      class="col-span-full flex items-center justify-center py-4 gap-2"
      :class="colorClasses.text"
    >
      <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0s" />
      <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.1s" />
      <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.2s" />
    </div>
  </div>
</template>
