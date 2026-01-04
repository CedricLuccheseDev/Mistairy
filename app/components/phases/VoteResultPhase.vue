<script setup lang="ts">
import type { Database } from '#shared/types/database.types'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  players: Player[]
}>()

/* --- Computed --- */
// Find the eliminated player from the most recent game events
const eliminatedPlayer = computed(() => {
  // The eliminated player is the one who was just killed (dead and not from before)
  // We can check the narration_text or the game events
  // For simplicity, parse the narration_text to find the name
  const narration = props.game.narration_text || ''
  const deadPlayers = props.players.filter(p => !p.is_alive)

  // Find player mentioned in narration as eliminated
  for (const player of deadPlayers) {
    if (narration.includes(player.name)) {
      return player
    }
  }
  return null
})

const isTie = computed(() => {
  const narration = props.game.narration_text || ''
  return narration.includes('Égalité') || narration.includes('sort désigne')
})

</script>

<template>
  <div class="flex-1 flex flex-col relative min-h-0 overflow-visible">
    <!-- Background particles -->
    <GamePhaseParticles phase="vote" intensity="medium" />

    <!-- Background effects -->
    <Teleport to="body">
      <div
        class="fixed inset-0 pointer-events-none -z-10 transition-opacity duration-500"
        :style="{
          background: eliminatedPlayer
            ? 'radial-gradient(ellipse 80% 60% at 50% 33%, rgba(239, 68, 68, 0.4) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 80% 60% at 50% 33%, rgba(249, 115, 22, 0.3) 0%, transparent 70%)'
        }"
      />
    </Teleport>

    <!-- Radial glow -->
    <div
      class="absolute inset-0 bg-gradient-radial pointer-events-none transition-colors duration-500"
      :class="eliminatedPlayer ? 'from-red-500/20' : 'from-orange-500/15'"
    />

    <!-- Main Content -->
    <div class="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
      <!-- Eliminated player display -->
      <div v-if="eliminatedPlayer" class="text-center animate-fade-up">
        <!-- Death icon -->
        <div class="relative mb-6">
          <div class="text-8xl sm:text-9xl animate-attention">
            {{ isTie ? '🎲' : '💀' }}
          </div>
          <div class="absolute inset-0 blur-3xl bg-red-500/30 rounded-full -z-10" />
        </div>

        <!-- Title -->
        <h1 class="text-3xl sm:text-4xl font-black text-red-400 mb-4">
          {{ isTie ? 'Égalité ! Le sort a tranché' : 'Éliminé par le village' }}
        </h1>

        <!-- Player name -->
        <div class="mb-6">
          <p class="text-4xl sm:text-5xl font-bold text-white mb-2">
            {{ eliminatedPlayer.name }}
          </p>
          <div class="w-24 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent mx-auto" />
        </div>

        <!-- Narration text -->
        <p class="text-lg text-white/60 max-w-md mx-auto italic">
          "{{ game.narration_text }}"
        </p>
      </div>

      <!-- No elimination (no votes only - ties now always eliminate someone) -->
      <div v-else class="text-center animate-fade-up">
        <!-- No votes icon -->
        <div class="relative mb-6">
          <div class="text-8xl sm:text-9xl">
            🤷
          </div>
          <div class="absolute inset-0 blur-3xl bg-orange-500/20 rounded-full -z-10" />
        </div>

        <!-- Title -->
        <h1 class="text-3xl sm:text-4xl font-black text-orange-400 mb-4">
          Aucun vote
        </h1>

        <!-- Subtitle -->
        <p class="text-xl text-white/70 mb-6">
          Personne n'est éliminé
        </p>

        <!-- Narration text -->
        <p class="text-lg text-white/60 max-w-md mx-auto italic">
          "{{ game.narration_text }}"
        </p>
      </div>

      <!-- Timer indicator -->
      <div class="mt-8 text-center text-white/40 text-sm animate-pulse">
        <p>La nuit va bientôt tomber...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-gradient-radial {
  background: radial-gradient(ellipse at top, var(--tw-gradient-stops));
}
</style>
