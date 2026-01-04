<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { ROLES_CONFIG } from '#shared/config/roles.config'
import type { Role } from '#shared/types/game'
import * as gameApi from '~/services/gameApi'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: Player
  alivePlayers: Player[]
  players: Player[] // All players for displaying dead ones
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

// Dead players for display
const deadPlayers = computed(() => props.players.filter(p => !p.is_alive))

/* --- Helpers --- */
function getPlayerIcon(player: Player): string {
  // Show role icon for current player (always)
  if (player.id === props.currentPlayer.id && player.role) {
    return ROLES_CONFIG[player.role as Role]?.emoji || '👤'
  }
  // Show role icon for dead players (their role is revealed)
  if (!player.is_alive && player.role) {
    return ROLES_CONFIG[player.role as Role]?.emoji || '💀'
  }
  return '👤'
}

/* --- Methods --- */
async function selectAndVote(player: Player) {
  if (hasVoted.value || isSubmitting.value) return

  selectedId.value = player.id
  isSubmitting.value = true

  try {
    await gameApi.submitVote(props.game.id, props.currentPlayer.id, player.id)
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

        <!-- Narration text -->
        <div v-if="game.narration_text" class="mt-4 mx-auto max-w-md">
          <p class="text-sm text-white/50 italic text-center leading-relaxed">
            "{{ game.narration_text }}"
          </p>
        </div>
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
              :current-player="currentPlayer"
              color="orange"
              @select="selectAndVote"
            />

            <!-- Dead players section -->
            <div v-if="deadPlayers.length > 0" class="mt-6 pt-4 border-t border-white/10">
              <p class="text-sm text-white/40 mb-3 text-center">Éliminés</p>
              <div class="grid grid-cols-4 sm:grid-cols-5 gap-2">
                <div
                  v-for="player in deadPlayers"
                  :key="player.id"
                  class="flex flex-col items-center p-2 rounded-xl bg-neutral-900/50 border border-neutral-700/30 opacity-70"
                >
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center mb-1 relative"
                    :class="[
                      player.role && ROLES_CONFIG[player.role as Role]?.team === 'werewolf'
                        ? 'bg-red-900/50 border border-red-500/30'
                        : 'bg-violet-900/50 border border-violet-500/30'
                    ]"
                  >
                    <span class="text-xl">{{ getPlayerIcon(player) }}</span>
                    <span class="absolute -top-1 -right-1 text-[10px] bg-neutral-900 rounded-full w-4 h-4 flex items-center justify-center border border-neutral-700">💀</span>
                  </div>
                  <p class="text-xs text-neutral-400 truncate w-full text-center line-through">
                    {{ player.name }}
                  </p>
                </div>
              </div>
            </div>
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
