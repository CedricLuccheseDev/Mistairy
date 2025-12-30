<script setup lang="ts">
import type { Game } from '#shared/types/game'

/* --- Props --- */
const props = defineProps<{
  game: Game
  playerCount: number
  aliveCount: number
}>()

/* --- Computed --- */
const phaseInfo = computed(() => {
  switch (props.game.status) {
    case 'lobby':
      return { icon: '⏳', label: 'Lobby', color: 'text-neutral-400', bg: 'bg-neutral-800' }
    case 'night':
      return { icon: '🌙', label: `Nuit ${props.game.day_number}`, color: 'text-indigo-400', bg: 'bg-indigo-900/50' }
    case 'day':
      return { icon: '☀️', label: `Jour ${props.game.day_number}`, color: 'text-amber-400', bg: 'bg-amber-900/50' }
    case 'vote':
      return { icon: '🗳️', label: 'Vote', color: 'text-orange-400', bg: 'bg-orange-900/50' }
    case 'finished':
      return {
        icon: props.game.winner === 'village' ? '🏆' : '🐺',
        label: props.game.winner === 'village' ? 'Village victorieux' : 'Loups victorieux',
        color: props.game.winner === 'village' ? 'text-green-400' : 'text-red-400',
        bg: props.game.winner === 'village' ? 'bg-green-900/50' : 'bg-red-900/50'
      }
    default:
      return { icon: '❓', label: 'Inconnu', color: 'text-neutral-400', bg: 'bg-neutral-800' }
  }
})
</script>

<template>
  <div class="rounded-2xl border border-neutral-700/50 bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
    <!-- Top section with phase -->
    <div class="px-4 py-3 border-b border-neutral-700/50" :class="phaseInfo.bg">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{{ phaseInfo.icon }}</span>
          <div>
            <h2 class="font-bold text-white">{{ phaseInfo.label }}</h2>
            <p class="text-xs text-neutral-400">Partie {{ game.code }}</p>
          </div>
        </div>

        <!-- Timer -->
        <GameTimer
          v-if="game.phase_end_at && game.status !== 'lobby' && game.status !== 'finished'"
          :end-at="game.phase_end_at"
        />
      </div>
    </div>

    <!-- Bottom section with stats -->
    <div class="px-4 py-2 flex items-center justify-around">
      <div class="text-center">
        <p class="text-lg font-bold text-white">{{ aliveCount }}</p>
        <p class="text-xs text-neutral-500">En vie</p>
      </div>
      <div class="w-px h-8 bg-neutral-700" />
      <div class="text-center">
        <p class="text-lg font-bold text-neutral-400">{{ playerCount - aliveCount }}</p>
        <p class="text-xs text-neutral-500">Éliminés</p>
      </div>
      <div class="w-px h-8 bg-neutral-700" />
      <div class="text-center">
        <p class="text-lg font-bold text-white">{{ playerCount }}</p>
        <p class="text-xs text-neutral-500">Total</p>
      </div>
    </div>
  </div>
</template>
