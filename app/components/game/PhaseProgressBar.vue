<script setup lang="ts">
import type { GameStatus } from '#shared/types/game'

/* --- Props --- */
const props = defineProps<{
  status: GameStatus
  dayNumber: number
}>()

/* --- Computed --- */
const currentPhaseInfo = computed(() => {
  const status = props.status
  const day = props.dayNumber

  if (status === 'night' || status === 'night_intro') {
    return { icon: '🌙', label: `Nuit ${day}`, color: 'indigo' }
  }
  if (status === 'day' || status === 'day_intro') {
    return { icon: '☀️', label: `Jour ${day}`, color: 'amber' }
  }
  if (status === 'vote' || status === 'vote_result') {
    return { icon: '⚖️', label: 'Vote', color: 'orange' }
  }
  if (status === 'hunter') {
    return { icon: '🎯', label: 'Chasseur', color: 'red' }
  }
  return { icon: '🎮', label: 'Partie', color: 'violet' }
})

const colorClasses = computed(() => {
  const colors = {
    indigo: {
      bg: 'bg-indigo-500',
      text: 'text-indigo-400',
      glow: 'shadow-indigo-500/50',
      border: 'border-indigo-500/50'
    },
    amber: {
      bg: 'bg-amber-500',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/50',
      border: 'border-amber-500/50'
    },
    orange: {
      bg: 'bg-orange-500',
      text: 'text-orange-400',
      glow: 'shadow-orange-500/50',
      border: 'border-orange-500/50'
    },
    red: {
      bg: 'bg-red-500',
      text: 'text-red-400',
      glow: 'shadow-red-500/50',
      border: 'border-red-500/50'
    },
    violet: {
      bg: 'bg-violet-500',
      text: 'text-violet-400',
      glow: 'shadow-violet-500/50',
      border: 'border-violet-500/50'
    }
  }
  return colors[currentPhaseInfo.value.color as keyof typeof colors]
})

const showProgressBar = computed(() => {
  return !['lobby', 'finished'].includes(props.status)
})
</script>

<template>
  <div
    v-if="showProgressBar"
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border backdrop-blur-sm"
    :class="[colorClasses.border, 'bg-white/5']"
  >
    <span class="text-sm">{{ currentPhaseInfo.icon }}</span>
    <span class="text-xs font-medium" :class="colorClasses.text">
      {{ currentPhaseInfo.label }}
    </span>
  </div>
</template>
