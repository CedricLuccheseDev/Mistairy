<script setup lang="ts">
/* --- Props --- */
defineProps<{
  phase: 'night_intro' | 'day_intro'
  text: string
  isHost: boolean
}>()

/* --- Emits --- */
const emit = defineEmits<{
  skip: []
}>()

/* --- Computed --- */
const phaseIcon = computed(() => {
  const props = getCurrentInstance()?.props as { phase: string }
  switch (props.phase) {
    case 'night_intro': return '🌙'
    case 'day_intro': return '☀️'
    default: return '🌙'
  }
})

const phaseTitle = computed(() => {
  const props = getCurrentInstance()?.props as { phase: string }
  switch (props.phase) {
    case 'night_intro': return 'La nuit tombe...'
    case 'day_intro': return 'Le jour se lève...'
    default: return ''
  }
})

const bgClass = computed(() => {
  const props = getCurrentInstance()?.props as { phase: string }
  switch (props.phase) {
    case 'night_intro': return 'bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950'
    case 'day_intro': return 'bg-gradient-to-b from-amber-950/80 via-slate-950 to-slate-950'
    default: return 'bg-slate-950'
  }
})

const glowClass = computed(() => {
  const props = getCurrentInstance()?.props as { phase: string }
  switch (props.phase) {
    case 'night_intro': return 'bg-indigo-500/20'
    case 'day_intro': return 'bg-amber-500/20'
    default: return 'bg-indigo-500/20'
  }
})

const dotClass = computed(() => {
  const props = getCurrentInstance()?.props as { phase: string }
  switch (props.phase) {
    case 'night_intro': return 'bg-indigo-400'
    case 'day_intro': return 'bg-amber-400'
    default: return 'bg-indigo-400'
  }
})

const textClass = computed(() => {
  const props = getCurrentInstance()?.props as { phase: string }
  switch (props.phase) {
    case 'night_intro': return 'text-indigo-400'
    case 'day_intro': return 'text-amber-400'
    default: return 'text-indigo-400'
  }
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
    :class="bgClass"
  >
    <div class="text-center max-w-md animate-fade-up">
      <!-- Phase icon -->
      <div class="relative mb-8">
        <div class="text-8xl animate-float filter drop-shadow-2xl">
          {{ phaseIcon }}
        </div>
        <div
          class="absolute -inset-8 blur-3xl rounded-full -z-10 animate-pulse"
          :class="glowClass"
        />
      </div>

      <!-- Title -->
      <h2 class="text-2xl font-bold text-white mb-6">
        {{ phaseTitle }}
      </h2>

      <!-- Narration text -->
      <div class="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
        <p class="text-neutral-300 leading-relaxed italic">
          "{{ text }}"
        </p>
      </div>

      <!-- Speaking indicator -->
      <div class="flex items-center justify-center gap-3" :class="textClass">
        <div class="flex gap-1">
          <span
            class="w-2 h-2 rounded-full animate-bounce"
            :class="dotClass"
            style="animation-delay: 0s"
          />
          <span
            class="w-2 h-2 rounded-full animate-bounce"
            :class="dotClass"
            style="animation-delay: 0.1s"
          />
          <span
            class="w-2 h-2 rounded-full animate-bounce"
            :class="dotClass"
            style="animation-delay: 0.2s"
          />
        </div>
        <span class="text-sm">{{ isHost ? 'Le narrateur parle...' : 'En attente de l\'hôte...' }}</span>
      </div>

      <!-- Continue button (host only) -->
      <button
        v-if="isHost"
        class="mt-6 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
        @click="emit('skip')"
      >
        Continuer →
      </button>
    </div>
  </div>
</template>
