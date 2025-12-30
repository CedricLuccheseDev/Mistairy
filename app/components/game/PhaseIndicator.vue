<script setup lang="ts">
import type { GameStatus } from '#shared/types/game'

/* --- Props --- */
const props = defineProps<{
  status: GameStatus
  dayNumber: number
}>()

/* --- Computed --- */
const phaseConfig = computed(() => {
  switch (props.status) {
    case 'lobby':
      return {
        icon: '⏳',
        label: 'En attente',
        color: 'text-neutral-400',
        bg: 'bg-neutral-900/80'
      }
    case 'night':
      return {
        icon: '🌙',
        label: `Nuit ${props.dayNumber}`,
        color: 'text-indigo-400',
        bg: 'bg-indigo-950/80'
      }
    case 'day':
      return {
        icon: '☀️',
        label: `Jour ${props.dayNumber}`,
        color: 'text-amber-400',
        bg: 'bg-amber-950/80'
      }
    case 'vote':
      return {
        icon: '⚖️',
        label: 'Vote',
        color: 'text-orange-400',
        bg: 'bg-orange-950/80'
      }
    case 'finished':
      return {
        icon: '🏁',
        label: 'Terminé',
        color: 'text-green-400',
        bg: 'bg-green-950/80'
      }
    default:
      return {
        icon: '❓',
        label: 'Inconnu',
        color: 'text-neutral-400',
        bg: 'bg-neutral-900/80'
      }
  }
})
</script>

<template>
  <div
    class="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10"
    :class="phaseConfig.bg"
  >
    <span class="text-xl">{{ phaseConfig.icon }}</span>
    <span class="font-semibold" :class="phaseConfig.color">
      {{ phaseConfig.label }}
    </span>
  </div>
</template>
