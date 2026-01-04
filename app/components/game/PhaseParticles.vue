<script setup lang="ts">
/* --- Props --- */
const props = withDefaults(defineProps<{
  phase?: 'night' | 'day' | 'vote' | 'hunter' | 'lobby' | 'finished' | string
  intensity?: 'low' | 'medium' | 'high'
}>(), {
  phase: 'night',
  intensity: 'medium'
})

// Normalize phase to valid particle phase
const normalizedPhase = computed(() => {
  const phase = props.phase
  if (phase === 'night' || phase === 'night_intro') return 'night'
  if (phase === 'day' || phase === 'day_intro') return 'day'
  if (phase === 'vote' || phase === 'vote_result') return 'vote'
  if (phase === 'hunter') return 'hunter'
  if (phase === 'lobby') return 'lobby'
  if (phase === 'finished') return 'day' // Use day colors for finished
  return 'night' // Default
})

/* --- Computed --- */
// Floating orbs (larger, slower)
const orbs = computed(() => {
  const count = props.intensity === 'low' ? 4 : props.intensity === 'high' ? 10 : 6
  return Array.from({ length: count }, (_, i) => ({
    id: `orb-${i}`,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 80 + 40,
    delay: Math.random() * 10,
    duration: Math.random() * 15 + 20
  }))
})

// Sparkles (tiny, fast)
const sparkles = computed(() => {
  const count = props.intensity === 'low' ? 15 : props.intensity === 'high' ? 50 : 30
  return Array.from({ length: count }, (_, i) => ({
    id: `sparkle-${i}`,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 8,
    duration: Math.random() * 4 + 3
  }))
})

// Rising particles (moves upward)
const risers = computed(() => {
  const count = props.intensity === 'low' ? 6 : props.intensity === 'high' ? 18 : 12
  return Array.from({ length: count }, (_, i) => ({
    id: `riser-${i}`,
    left: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 12,
    duration: Math.random() * 8 + 8
  }))
})

const phaseColors = computed(() => {
  const colors = {
    lobby: {
      primary: 'rgba(139, 92, 246, 0.3)',
      secondary: 'rgba(99, 102, 241, 0.2)',
      sparkle: 'rgba(167, 139, 250, 0.6)',
      gradient: 'from-violet-500/20 via-indigo-500/10 to-transparent'
    },
    night: {
      primary: 'rgba(99, 102, 241, 0.25)',
      secondary: 'rgba(139, 92, 246, 0.2)',
      sparkle: 'rgba(165, 180, 252, 0.7)',
      gradient: 'from-indigo-500/20 via-violet-500/10 to-transparent'
    },
    day: {
      primary: 'rgba(245, 158, 11, 0.2)',
      secondary: 'rgba(251, 191, 36, 0.15)',
      sparkle: 'rgba(253, 224, 71, 0.8)',
      gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent'
    },
    vote: {
      primary: 'rgba(249, 115, 22, 0.25)',
      secondary: 'rgba(239, 68, 68, 0.2)',
      sparkle: 'rgba(251, 146, 60, 0.7)',
      gradient: 'from-orange-500/20 via-red-500/10 to-transparent'
    },
    hunter: {
      primary: 'rgba(239, 68, 68, 0.3)',
      secondary: 'rgba(220, 38, 38, 0.2)',
      sparkle: 'rgba(252, 165, 165, 0.8)',
      gradient: 'from-red-500/20 via-rose-500/10 to-transparent'
    }
  }
  return colors[normalizedPhase.value]
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 pointer-events-none overflow-hidden" style="z-index: -1" aria-hidden="true">
      <!-- Gradient overlay -->
      <div
        class="absolute inset-0 bg-gradient-radial opacity-50 transition-all duration-1000"
        :class="phaseColors.gradient"
      />

      <!-- Large floating orbs -->
      <div
        v-for="orb in orbs"
        :key="orb.id"
        class="absolute rounded-full animate-float-slow"
        :style="{
          left: `${orb.left}%`,
          top: `${orb.top}%`,
          width: `${orb.size}px`,
          height: `${orb.size}px`,
          background: `radial-gradient(circle, ${phaseColors.primary} 0%, transparent 70%)`,
          animationDelay: `${orb.delay}s`,
          animationDuration: `${orb.duration}s`,
          filter: 'blur(20px)'
        }"
      />

      <!-- Sparkles -->
      <div
        v-for="sparkle in sparkles"
        :key="sparkle.id"
        class="absolute rounded-full animate-sparkle"
        :style="{
          left: `${sparkle.left}%`,
          top: `${sparkle.top}%`,
          width: `${sparkle.size}px`,
          height: `${sparkle.size}px`,
          backgroundColor: phaseColors.sparkle,
          animationDelay: `${sparkle.delay}s`,
          animationDuration: `${sparkle.duration}s`,
          boxShadow: `0 0 ${sparkle.size * 2}px ${phaseColors.sparkle}`
        }"
      />

      <!-- Rising particles -->
      <div
        v-for="riser in risers"
        :key="riser.id"
        class="absolute animate-rise"
        :style="{
          left: `${riser.left}%`,
          bottom: '-20px',
          width: `${riser.size}px`,
          height: `${riser.size}px`,
          backgroundColor: phaseColors.secondary,
          borderRadius: '50%',
          animationDelay: `${riser.delay}s`,
          animationDuration: `${riser.duration}s`,
          filter: `blur(${riser.size / 2}px)`
        }"
      />

      <!-- Ambient glow areas -->
      <div
        class="absolute w-96 h-96 rounded-full animate-pulse-slow"
        :style="{
          left: '5%',
          top: '10%',
          background: `radial-gradient(circle, ${phaseColors.primary} 0%, transparent 70%)`,
          filter: 'blur(80px)'
        }"
      />
      <div
        class="absolute w-80 h-80 rounded-full animate-pulse-slow"
        style="animation-delay: 2s"
        :style="{
          right: '10%',
          bottom: '20%',
          background: `radial-gradient(circle, ${phaseColors.secondary} 0%, transparent 70%)`,
          filter: 'blur(60px)'
        }"
      />
      <div
        class="absolute w-64 h-64 rounded-full animate-pulse-slow"
        style="animation-delay: 4s"
        :style="{
          left: '40%',
          top: '50%',
          background: `radial-gradient(circle, ${phaseColors.primary} 0%, transparent 70%)`,
          filter: 'blur(50px)'
        }"
      />
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes float-slow {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.6;
  }
  25% {
    transform: translate(20px, -30px) scale(1.1);
    opacity: 0.8;
  }
  50% {
    transform: translate(-10px, -50px) scale(0.9);
    opacity: 0.5;
  }
  75% {
    transform: translate(-25px, -20px) scale(1.05);
    opacity: 0.7;
  }
}

@keyframes sparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0);
  }
  20% {
    opacity: 1;
    transform: scale(1);
  }
  80% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes rise {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.4;
  }
  100% {
    transform: translateY(-100vh) translateX(30px);
    opacity: 0;
  }
}

@keyframes pulse-slow {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.animate-float-slow {
  animation: float-slow ease-in-out infinite;
}

.animate-sparkle {
  animation: sparkle ease-in-out infinite;
}

.animate-rise {
  animation: rise linear infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 8s ease-in-out infinite;
}

.bg-gradient-radial {
  background: radial-gradient(ellipse at center, var(--tw-gradient-stops));
}
</style>
