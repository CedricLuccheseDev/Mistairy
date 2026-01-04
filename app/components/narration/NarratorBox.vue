<script setup lang="ts">
/**
 * NarratorBox - Inline narrator text display
 * Shows narration text as a small box on the game board
 * Used for night/vote phases where we don't want to block gameplay
 */

/* --- Props --- */
defineProps<{
  text: string | null
  phase: 'night' | 'day' | 'vote' | 'hunter'
}>()

/* --- Computed --- */
const phaseIcon = computed(() => {
  const props = getCurrentInstance()?.props as { phase: string }
  switch (props.phase) {
    case 'night': return '🌙'
    case 'day': return '☀️'
    case 'vote': return '⚖️'
    case 'hunter': return '🏹'
    default: return '🌙'
  }
})

const borderColor = computed(() => {
  const props = getCurrentInstance()?.props as { phase: string }
  switch (props.phase) {
    case 'night': return 'border-indigo-500/30'
    case 'day': return 'border-amber-500/30'
    case 'vote': return 'border-orange-500/30'
    case 'hunter': return 'border-red-500/30'
    default: return 'border-indigo-500/30'
  }
})

const bgColor = computed(() => {
  const props = getCurrentInstance()?.props as { phase: string }
  switch (props.phase) {
    case 'night': return 'bg-indigo-950/50'
    case 'day': return 'bg-amber-950/50'
    case 'vote': return 'bg-orange-950/50'
    case 'hunter': return 'bg-red-950/50'
    default: return 'bg-indigo-950/50'
  }
})
</script>

<template>
  <div
    v-if="text"
    class="w-full max-w-md mx-auto mb-4 p-3 rounded-xl border backdrop-blur-sm animate-fade-up"
    :class="[borderColor, bgColor]"
  >
    <div class="flex items-start gap-3">
      <span class="text-xl shrink-0">{{ phaseIcon }}</span>
      <p class="text-sm text-neutral-300 italic leading-relaxed">
        {{ text }}
      </p>
    </div>
  </div>
</template>
