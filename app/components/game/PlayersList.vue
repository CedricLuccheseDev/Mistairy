<script setup lang="ts">
import type { Player } from '#shared/types/game'

/* --- Props --- */
defineProps<{
  players: Player[]
  currentPlayerId?: string
  showRoles?: boolean
}>()
</script>

<template>
  <div class="rounded-2xl border border-neutral-700/50 bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
    <div class="px-4 py-3 border-b border-neutral-700/50">
      <h3 class="font-semibold text-white flex items-center gap-2">
        <span>👥</span>
        Joueurs
      </h3>
    </div>

    <div class="divide-y divide-neutral-800">
      <div
        v-for="player in players"
        :key="player.id"
        class="px-4 py-3 flex items-center justify-between transition-colors"
        :class="[
          player.id === currentPlayerId && 'bg-violet-900/20',
          !player.is_alive && 'opacity-50'
        ]"
      >
        <div class="flex items-center gap-3">
          <!-- Avatar/Status indicator -->
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            :class="player.is_alive ? 'bg-neutral-800' : 'bg-neutral-900'"
          >
            <span v-if="!player.is_alive">💀</span>
            <span v-else-if="showRoles && player.role">
              {{ player.role === 'werewolf' ? '🐺' : player.role === 'seer' ? '🔮' : player.role === 'witch' ? '🧪' : player.role === 'hunter' ? '🏹' : '👤' }}
            </span>
            <span v-else>{{ player.name.charAt(0).toUpperCase() }}</span>
          </div>

          <!-- Name and badges -->
          <div>
            <p
              class="font-medium"
              :class="[
                player.id === currentPlayerId ? 'text-violet-300' : 'text-white',
                !player.is_alive && 'line-through'
              ]"
            >
              {{ player.name }}
              <span v-if="player.id === currentPlayerId" class="text-violet-400 text-xs">(toi)</span>
            </p>
            <div class="flex items-center gap-2 mt-0.5">
              <span
                v-if="player.is_host"
                class="text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400"
              >
                Hôte
              </span>
              <span
                v-if="!player.is_alive"
                class="text-xs text-neutral-500"
              >
                Éliminé
              </span>
            </div>
          </div>
        </div>

        <!-- Status dot -->
        <div
          class="w-2 h-2 rounded-full"
          :class="player.is_alive ? 'bg-green-500' : 'bg-neutral-600'"
        />
      </div>
    </div>
  </div>
</template>
