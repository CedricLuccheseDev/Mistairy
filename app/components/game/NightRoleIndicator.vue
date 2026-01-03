<script setup lang="ts">
import { getNightRoleUI } from '#shared/config/roles.config'
import type { NightRole } from '#shared/types/game'

/* --- Props --- */
const props = defineProps<{
  currentRole: NightRole | 'waiting' | null
  isMyTurn?: boolean
}>()

/* --- Computed --- */
const config = computed(() => getNightRoleUI(props.currentRole))
</script>

<template>
  <div
    v-if="currentRole"
    class="rounded-2xl border backdrop-blur-sm p-4 transition-all duration-500"
    :class="[
      config.bgColor,
      config.borderColor,
      isMyTurn && 'ring-2 ring-offset-2 ring-offset-transparent animate-pulse-glow',
      isMyTurn && (currentRole === 'werewolf' ? 'ring-red-500' : currentRole === 'seer' ? 'ring-violet-500' : 'ring-emerald-500')
    ]"
  >
    <div class="flex items-center gap-4">
      <!-- Animated icon -->
      <div
        class="w-16 h-16 rounded-full flex items-center justify-center text-4xl"
        :class="[config.bgColor, isMyTurn ? 'animate-pulse' : 'animate-float']"
      >
        {{ config.icon }}
      </div>

      <!-- Info -->
      <div class="flex-1">
        <p
          class="font-bold text-lg"
          :class="config.textColor"
        >
          {{ config.label }}
        </p>
        <p class="text-neutral-400 text-sm">
          {{ config.action }}
        </p>

        <!-- Your turn indicator -->
        <p
          v-if="isMyTurn"
          class="mt-1 text-xs font-semibold uppercase tracking-wider"
          :class="config.textColor"
        >
          C'est ton tour !
        </p>
      </div>
    </div>
  </div>
</template>
