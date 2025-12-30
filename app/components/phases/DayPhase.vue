<script setup lang="ts">
import type { Database } from '#shared/types/database.types'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
defineProps<{
  game: Game
  currentPlayer: Player
  alivePlayers: Player[]
}>()
</script>

<template>
  <div class="rounded-2xl border border-amber-500/30 bg-amber-950/30 backdrop-blur-sm overflow-hidden">
    <!-- Header -->
    <div class="p-4 border-b border-white/10">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-amber-900/50 flex items-center justify-center text-2xl animate-float">
          ☀️
        </div>
        <div class="flex-1">
          <p class="font-bold text-amber-400">Jour {{ game.day_number }}</p>
          <p class="text-neutral-500 text-sm">Débattez et trouvez les loups</p>
        </div>
        <div class="px-2 py-1 rounded-full bg-amber-900/50 text-amber-300 text-xs">
          {{ alivePlayers.length }} en vie
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <!-- Dead player view -->
      <div v-if="!currentPlayer.is_alive" class="text-center py-6">
        <div class="text-4xl mb-2 opacity-70">💀</div>
        <p class="text-neutral-300 font-medium">Éliminé</p>
        <p class="text-neutral-500 text-sm">Tu observes en silence...</p>
      </div>

      <!-- Discussion phase -->
      <template v-else>
        <!-- Players grid -->
        <div class="grid grid-cols-3 gap-2 mb-4">
          <div
            v-for="player in alivePlayers"
            :key="player.id"
            class="p-2 rounded-xl text-center"
            :class="player.id === currentPlayer.id ? 'bg-amber-900/30 border border-amber-500/30' : 'bg-white/5'"
          >
            <div class="text-xl mb-1">👤</div>
            <p class="text-xs truncate" :class="player.id === currentPlayer.id ? 'text-amber-300 font-medium' : 'text-neutral-400'">
              {{ player.name }}
            </p>
          </div>
        </div>

        <!-- Discussion message -->
        <div class="text-center py-4 rounded-xl bg-white/5">
          <div class="text-2xl mb-2">💬</div>
          <p class="text-neutral-300 font-medium">Discussion en cours</p>
          <p class="text-neutral-500 text-sm">Le vote approche...</p>
        </div>
      </template>
    </div>
  </div>
</template>
