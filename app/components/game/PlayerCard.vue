<script setup lang="ts">
import { ROLES_CONFIG } from '#shared/config/roles.config'
import type { Player } from '#shared/types/game'

/* --- Props --- */
const props = defineProps<{
  player: Player
  showRole?: boolean
}>()

/* --- Computed --- */
const roleInfo = computed(() => {
  if (!props.player.role) return null
  return ROLES_CONFIG[props.player.role]
})

const isWerewolf = computed(() => props.player.role === 'werewolf')
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300"
    :class="[
      isWerewolf
        ? 'border-red-500/30 bg-gradient-to-br from-red-950/80 to-neutral-900/90'
        : 'border-violet-500/30 bg-gradient-to-br from-violet-950/80 to-neutral-900/90',
      !player.is_alive && 'opacity-50 grayscale'
    ]"
  >
    <!-- Glow effect -->
    <div
      class="absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl"
      :class="isWerewolf ? 'bg-red-500/20' : 'bg-violet-500/20'"
    />

    <div class="relative p-4">
      <!-- Role emoji large -->
      <div class="text-center mb-3">
        <div
          class="inline-flex items-center justify-center w-20 h-20 rounded-full text-5xl animate-float"
          :class="isWerewolf ? 'bg-red-900/50' : 'bg-violet-900/50'"
        >
          {{ roleInfo?.emoji || '❓' }}
        </div>
      </div>

      <!-- Player name -->
      <h3 class="text-center text-lg font-bold text-white mb-1">
        {{ player.name }}
      </h3>

      <!-- Role name -->
      <p
        v-if="showRole && roleInfo"
        class="text-center text-sm font-medium"
        :class="isWerewolf ? 'text-red-400' : 'text-violet-400'"
      >
        {{ roleInfo.name }}
      </p>

      <!-- Status badge -->
      <div class="flex justify-center mt-3">
        <span
          v-if="!player.is_alive"
          class="px-3 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400"
        >
          Éliminé
        </span>
        <span
          v-else-if="showRole && roleInfo"
          class="px-3 py-1 rounded-full text-xs font-medium"
          :class="roleInfo.team === 'werewolf' ? 'bg-red-900/50 text-red-300' : 'bg-violet-900/50 text-violet-300'"
        >
          {{ roleInfo.team === 'werewolf' ? 'Loup-Garou' : 'Village' }}
        </span>
      </div>

      <!-- Role description (optional) -->
      <p
        v-if="showRole && roleInfo"
        class="mt-3 text-center text-xs text-neutral-400 leading-relaxed"
      >
        {{ roleInfo.description }}
      </p>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
