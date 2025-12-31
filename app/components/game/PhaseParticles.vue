<script setup lang="ts">
/* --- Props --- */
const props = withDefaults(defineProps<{
  phase?: 'night' | 'day' | 'vote' | 'hunter'
  count?: number
  intensity?: 'low' | 'medium' | 'high'
}>(), {
  phase: 'night',
  count: 15,
  intensity: 'medium'
})

/* --- Computed --- */
const particles = computed(() => {
  const count = props.intensity === 'low' ? 8 : props.intensity === 'high' ? 20 : props.count
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 8,
    duration: Math.random() * 6 + 6
  }))
})

const phaseColors = computed(() => {
  const colors = {
    night: {
      primary: 'bg-indigo-400/40',
      secondary: 'bg-violet-400/30',
      glow: 'shadow-indigo-500/50'
    },
    day: {
      primary: 'bg-amber-400/40',
      secondary: 'bg-orange-400/30',
      glow: 'shadow-amber-500/50'
    },
    vote: {
      primary: 'bg-orange-400/40',
      secondary: 'bg-red-400/30',
      glow: 'shadow-orange-500/50'
    },
    hunter: {
      primary: 'bg-red-400/40',
      secondary: 'bg-rose-400/30',
      glow: 'shadow-red-500/50'
    }
  }
  return colors[props.phase]
})
</script>

<template>
  <!-- All particles teleported to body for full screen coverage -->
  <Teleport to="body">
    <!-- Floating particles -->
    <div class="fixed inset-0 pointer-events-none -z-20" aria-hidden="true">
      <div
        v-for="particle in particles"
        :key="particle.id"
        class="absolute rounded-full animate-particle"
        :class="[particle.id % 2 === 0 ? phaseColors.primary : phaseColors.secondary]"
        :style="{
          left: `${particle.left}%`,
          top: `${particle.top}%`,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          animationDelay: `${particle.delay}s`,
          animationDuration: `${particle.duration}s`
        }"
      />

      <!-- Ambient glow spots -->
      <div
        class="absolute w-64 h-64 rounded-full opacity-20 animate-pulse"
        :class="phaseColors.primary"
        style="left: 10%; top: 20%; animation-duration: 4s; filter: blur(64px)"
      />
      <div
        class="absolute w-48 h-48 rounded-full opacity-15 animate-pulse"
        :class="phaseColors.secondary"
        style="right: 15%; bottom: 30%; animation-duration: 5s; animation-delay: 1s; filter: blur(64px)"
      />
      <div
        class="absolute w-32 h-32 rounded-full opacity-10 animate-pulse"
        :class="phaseColors.primary"
        style="left: 50%; top: 60%; animation-duration: 6s; animation-delay: 2s; filter: blur(48px)"
      />
    </div>
  </Teleport>
</template>
