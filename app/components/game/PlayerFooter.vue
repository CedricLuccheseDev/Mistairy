<script setup lang="ts">
import type { Player } from '#shared/types/game'
import { ROLES_CONFIG } from '#shared/config/roles.config'

/* --- Props --- */
const props = defineProps<{
  player: Player
  otherWerewolves?: Player[]
}>()

/* --- Emits --- */
const emit = defineEmits<{
  click: []
}>()

/* --- Computed --- */
const roleInfo = computed(() => {
  if (!props.player?.role) return null
  return ROLES_CONFIG[props.player.role]
})

const isWerewolf = computed(() => roleInfo.value?.team === 'werewolf')

const statusConfig = computed(() => {
  if (!props.player.is_alive) {
    return {
      label: 'Eliminé',
      icon: '💀',
      classes: 'bg-neutral-800/80 text-neutral-400 border-neutral-700'
    }
  }
  if (isWerewolf.value) {
    return {
      label: 'En vie',
      icon: '🐺',
      classes: 'bg-red-950/80 text-red-300 border-red-800/50'
    }
  }
  return {
    label: 'En vie',
    icon: '💚',
    classes: 'bg-violet-950/80 text-violet-300 border-violet-800/50'
  }
})
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 safe-area-pb z-40">
    <!-- Gradient fade -->
    <div class="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />

    <!-- Footer content -->
    <div class="relative bg-slate-950/95 backdrop-blur-xl border-t border-white/5">
      <button
        class="w-full p-4 flex items-center gap-4 transition-colors hover:bg-white/5 active:bg-white/10"
        @click="emit('click')"
      >
        <!-- Avatar with role -->
        <div class="relative">
          <!-- Glow effect for werewolf -->
          <div
            v-if="isWerewolf && player.is_alive"
            class="absolute inset-0 rounded-2xl blur-xl animate-pulse"
            style="background: rgba(239, 68, 68, 0.3)"
          />

          <div
            class="relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all duration-300"
            :class="[
              isWerewolf ? 'bg-gradient-to-br from-red-900/80 to-red-950 border-red-700/50' : 'bg-gradient-to-br from-violet-900/80 to-violet-950 border-violet-700/50',
              !player.is_alive && 'grayscale opacity-60'
            ]"
          >
            {{ roleInfo?.emoji || '❓' }}
          </div>

          <!-- Status indicator -->
          <div
            v-if="player.is_alive"
            class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950"
            :class="isWerewolf ? 'bg-red-500' : 'bg-green-500'"
          />
        </div>

        <!-- Player info -->
        <div class="flex-1 text-left min-w-0">
          <p class="font-semibold text-white truncate">
            {{ player.name }}
          </p>
          <div class="flex items-center gap-2">
            <span
              class="text-sm font-medium"
              :class="isWerewolf ? 'text-red-400' : 'text-violet-400'"
            >
              {{ roleInfo?.name || 'Inconnu' }}
            </span>
            <!-- Werewolf pack indicator -->
            <span
              v-if="isWerewolf && otherWerewolves && otherWerewolves.length > 0 && player.is_alive"
              class="text-xs text-red-500/70"
            >
              +{{ otherWerewolves.length }}
            </span>
          </div>
        </div>

        <!-- Status badge -->
        <div
          class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border"
          :class="statusConfig.classes"
        >
          <span>{{ statusConfig.icon }}</span>
          <span>{{ statusConfig.label }}</span>
        </div>

        <!-- Arrow indicator -->
        <div class="shrink-0 text-white/30">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.safe-area-pb {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}
</style>
