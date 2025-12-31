<script setup lang="ts">
import type { Database } from '#shared/types/database.types'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: Player
  alivePlayers: Player[]
}>()

/* --- Services --- */
const toast = useToast()

/* --- States --- */
const hasVoted = ref(false)
const isSubmitting = ref(false)
const selectedId = ref<string | null>(null)

/* --- Computed --- */
const targets = computed(() =>
  props.alivePlayers.filter(p => p.id !== props.currentPlayer.id)
)

/* --- Methods --- */
async function selectAndVote(player: Player) {
  if (hasVoted.value || isSubmitting.value) return

  selectedId.value = player.id
  isSubmitting.value = true

  try {
    await $fetch('/api/game/action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        actionType: 'vote',
        targetId: player.id
      }
    })

    toast.add({ title: `🗳️ Vote contre ${player.name}`, color: 'success' })
    hasVoted.value = true
  }
  catch (e) {
    console.error('Vote failed:', e)
    toast.add({ title: 'Erreur, réessaie', color: 'error' })
    selectedId.value = null
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col relative min-h-0 overflow-visible">
    <!-- Background particles -->
    <GamePhaseParticles phase="vote" intensity="high" />

    <!-- All background effects teleported to body to avoid clipping -->
    <Teleport to="body">
      <!-- Urgency background pulse -->
      <div class="fixed inset-0 animate-urgency pointer-events-none -z-10" />

      <!-- Icon glow (radial gradient) -->
      <div
        class="fixed inset-0 pointer-events-none -z-10"
        style="background: radial-gradient(ellipse 80% 60% at 50% 33%, rgba(249, 115, 22, 0.5) 0%, transparent 70%);"
      />
    </Teleport>

    <!-- Radial glow (inside component, no blur) -->
    <div class="absolute inset-0 bg-gradient-radial from-orange-500/20 via-transparent to-transparent pointer-events-none" />

    <!-- Main Content -->
    <div class="relative z-10 flex-1 flex flex-col justify-center overflow-visible">
      <!-- Header -->
      <div class="text-center pb-4 px-4 animate-fade-up">
        <!-- Vote Icon -->
        <div class="relative inline-block mb-4">
          <div class="text-7xl sm:text-8xl animate-attention">🗳️</div>
        </div>

        <!-- Title -->
        <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-orange-400 mb-2">
          Le village vote
        </h1>

        <!-- Subtitle -->
        <p class="text-lg sm:text-xl text-white/60">
          {{ currentPlayer.is_alive ? 'Qui est le loup-garou ?' : 'Tu observes depuis l\'au-delà...' }}
        </p>
      </div>

      <!-- Content -->
      <div class="px-4 pb-6">
        <!-- Dead player view -->
        <div v-if="!currentPlayer.is_alive" class="flex-1 flex flex-col items-center justify-center py-12 animate-fade-up">
          <div class="text-center">
            <div class="text-6xl mb-6 opacity-50">💀</div>
            <p class="text-2xl font-bold text-white/70 mb-2">Éliminé</p>
            <p class="text-lg text-white/40">Tu observes en silence...</p>
          </div>
        </div>

        <!-- Vote form -->
        <template v-else-if="!hasVoted">
          <div class="animate-fade-up">
            <GameTargetGrid
              :targets="targets"
              :disabled="isSubmitting"
              :loading="isSubmitting"
              :selected-id="selectedId"
              color="orange"
              @select="selectAndVote"
            />
          </div>
        </template>

        <!-- Vote submitted -->
        <div v-else class="relative flex-1 flex flex-col items-center justify-center py-12 animate-scale-in">
          <!-- Success glow (absolute, centered) -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 blur-3xl opacity-30 bg-green-500 rounded-full pointer-events-none" />

          <div class="relative text-center">
            <!-- Success icon -->
            <div class="mb-6">
              <div class="text-7xl animate-check-pop">✅</div>
            </div>

            <!-- Title -->
            <p class="text-2xl font-bold text-green-400 mb-2">Vote enregistré</p>

            <!-- Subtitle -->
            <p class="text-lg text-white/40">Attends les autres joueurs...</p>

            <!-- Waiting animation -->
            <div class="flex items-center justify-center gap-2 mt-6 text-orange-400">
              <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0s" />
              <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.1s" />
              <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.2s" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-gradient-radial {
  background: radial-gradient(ellipse at top, var(--tw-gradient-stops));
}
</style>
