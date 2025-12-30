<script setup lang="ts">
import type { GameEvent } from '#shared/types/game'

/* --- Props --- */
defineProps<{
  events: GameEvent[]
}>()

/* --- Computed --- */
function getEventStyle(eventType: string) {
  switch (eventType) {
    case 'game_start':
      return { icon: '🎮', color: 'text-violet-400', bg: 'bg-violet-900/30' }
    case 'night_start':
      return { icon: '🌙', color: 'text-indigo-400', bg: 'bg-indigo-900/30' }
    case 'day_start':
      return { icon: '☀️', color: 'text-amber-400', bg: 'bg-amber-900/30' }
    case 'vote_start':
      return { icon: '🗳️', color: 'text-orange-400', bg: 'bg-orange-900/30' }
    case 'player_death':
    case 'werewolf_kill':
    case 'witch_kill':
    case 'hunter_kill':
      return { icon: '💀', color: 'text-red-400', bg: 'bg-red-900/30' }
    case 'witch_heal':
      return { icon: '💚', color: 'text-green-400', bg: 'bg-green-900/30' }
    case 'vote_result':
      return { icon: '⚖️', color: 'text-orange-400', bg: 'bg-orange-900/30' }
    case 'game_end':
      return { icon: '🏆', color: 'text-yellow-400', bg: 'bg-yellow-900/30' }
    default:
      return { icon: '📜', color: 'text-neutral-400', bg: 'bg-neutral-800/30' }
  }
}

function formatTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="rounded-2xl border border-neutral-700/50 bg-neutral-900/80 backdrop-blur-sm overflow-hidden">
    <div class="px-4 py-3 border-b border-neutral-700/50">
      <h3 class="font-semibold text-white flex items-center gap-2">
        <span>📜</span>
        Journal de partie
      </h3>
    </div>

    <div v-if="events.length === 0" class="px-4 py-8 text-center text-neutral-500">
      Aucun événement pour le moment
    </div>

    <div v-else class="max-h-64 overflow-y-auto">
      <TransitionGroup name="event" tag="div" class="divide-y divide-neutral-800/50">
        <div
          v-for="event in [...events].reverse()"
          :key="event.id"
          class="px-4 py-3 flex items-start gap-3 transition-all duration-300"
          :class="getEventStyle(event.event_type).bg"
        >
          <!-- Event icon -->
          <div class="text-xl flex-shrink-0 mt-0.5">
            {{ getEventStyle(event.event_type).icon }}
          </div>

          <!-- Event content -->
          <div class="flex-1 min-w-0">
            <p
              class="text-sm leading-relaxed"
              :class="getEventStyle(event.event_type).color"
            >
              {{ event.message }}
            </p>
            <p class="text-xs text-neutral-500 mt-1">
              {{ formatTime(event.created_at) }}
            </p>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.event-enter-active {
  transition: all 0.3s ease-out;
}

.event-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.event-leave-active {
  transition: all 0.2s ease-in;
}

.event-leave-to {
  opacity: 0;
}
</style>
