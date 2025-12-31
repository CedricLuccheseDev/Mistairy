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
const selectedId = ref<string | null>(null)
const isSubmitting = ref(false)
const hasActed = ref(false)

/* --- Computed --- */
const isHunter = computed(() => {
  return props.game.hunter_target_pending === props.currentPlayer.id
})

const validTargets = computed(() => {
  return props.alivePlayers.filter(p => p.id !== props.currentPlayer.id)
})

/* --- Methods --- */
async function selectAndShoot(player: Player) {
  if (isSubmitting.value || hasActed.value) return

  selectedId.value = player.id
  isSubmitting.value = true

  try {
    await $fetch('/api/game/action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        actionType: 'hunter_kill',
        targetId: player.id
      }
    })
    toast.add({ title: `🔫 ${player.name} a été abattu`, color: 'error' })
    hasActed.value = true
  }
  catch (error) {
    console.error('Hunter action failed:', error)
    toast.add({ title: 'Erreur', color: 'error' })
    selectedId.value = null
  }
  finally {
    isSubmitting.value = false
  }
}

async function skipShot() {
  if (isSubmitting.value || hasActed.value) return

  isSubmitting.value = true
  try {
    await $fetch('/api/game/action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        actionType: 'hunter_skip'
      }
    })
    toast.add({ title: '😴 Tu passes ton tir', color: 'info' })
    hasActed.value = true
  }
  catch (error) {
    console.error('Hunter skip failed:', error)
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col relative min-h-0 overflow-visible">
    <!-- Background particles -->
    <GamePhaseParticles phase="hunter" intensity="high" />

    <!-- All background effects teleported to body to avoid clipping -->
    <Teleport to="body">
      <!-- Urgency background pulse -->
      <div class="fixed inset-0 animate-urgency pointer-events-none -z-10" />

      <!-- Icon glow (radial gradient) -->
      <div
        class="fixed inset-0 pointer-events-none -z-10 transition-opacity duration-300"
        :class="isHunter && !hasActed ? 'opacity-100' : 'opacity-60'"
        style="background: radial-gradient(ellipse 80% 60% at 50% 33%, rgba(239, 68, 68, 0.5) 0%, transparent 70%);"
      />
    </Teleport>

    <!-- Radial glow (inside component, no blur) -->
    <div class="absolute inset-0 bg-gradient-radial from-red-500/25 via-transparent to-transparent pointer-events-none" />

    <!-- Main Content -->
    <div class="relative z-10 flex-1 flex flex-col justify-center overflow-visible">
      <!-- Hunter's turn -->
      <template v-if="isHunter && !hasActed">
        <!-- Header -->
        <div class="text-center pb-4 px-4 animate-fade-up">
          <!-- Crosshair Icon -->
          <div class="inline-block mb-4">
            <div class="text-7xl sm:text-8xl animate-crosshair">🏹</div>
          </div>

          <!-- Title -->
          <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-red-400 mb-2">
            Dernier souffle
          </h1>

          <!-- Subtitle -->
          <p class="text-lg sm:text-xl text-white/60">
            Tu peux emporter quelqu'un avec toi
          </p>

          <!-- Dramatic badge -->
          <div class="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-red-500/20 text-red-300 animate-pulse">
            <span class="w-2 h-2 rounded-full bg-current animate-ping" />
            <span class="font-semibold">Ton dernier acte</span>
          </div>
        </div>

        <!-- Content -->
        <div class="px-4 pb-6">
          <!-- Target Grid -->
          <div class="mb-6 animate-fade-up" style="animation-delay: 0.1s">
            <GameTargetGrid
              :targets="validTargets"
              :disabled="isSubmitting"
              :loading="isSubmitting"
              :selected-id="selectedId"
              color="red"
              @select="selectAndShoot"
            />
          </div>

          <!-- Skip button -->
          <div class="animate-fade-up" style="animation-delay: 0.2s">
            <button
              class="w-full py-4 px-6 rounded-2xl border-2 border-white/10 bg-white/5 text-white/60 font-semibold text-lg hover:bg-white/10 hover:text-white/80 transition-all duration-300 disabled:opacity-50"
              :disabled="isSubmitting"
              @click="skipShot"
            >
              <span class="mr-2">😴</span>
              Ne pas tirer
            </button>
          </div>
        </div>
      </template>

      <!-- Other players wait -->
      <template v-else-if="!isHunter">
        <!-- Header -->
        <div class="text-center pb-4 px-4 animate-fade-up">
          <!-- Crosshair Icon -->
          <div class="inline-block mb-4">
            <div class="text-7xl sm:text-8xl animate-crosshair opacity-70">🏹</div>
          </div>

          <!-- Title -->
          <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-red-400 mb-2">
            Le chasseur vise...
          </h1>

          <!-- Subtitle -->
          <p class="text-lg sm:text-xl text-white/60">
            Dans son dernier souffle, il peut emporter quelqu'un
          </p>
        </div>

        <!-- Content -->
        <div class="flex-1 px-4 pb-6 flex flex-col items-center justify-center">
          <div class="text-center animate-fade-up">
            <!-- Waiting icon -->
            <div class="text-6xl mb-6 opacity-50">⏳</div>

            <!-- Title -->
            <p class="text-2xl font-bold text-white/70 mb-2">En attente</p>

            <!-- Subtitle -->
            <p class="text-lg text-white/40">Le chasseur choisit sa cible...</p>

            <!-- Waiting animation -->
            <div class="flex items-center justify-center gap-2 mt-6 text-red-400">
              <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0s" />
              <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.1s" />
              <div class="w-2 h-2 rounded-full bg-current animate-bounce" style="animation-delay: 0.2s" />
            </div>
          </div>
        </div>
      </template>

      <!-- Action completed -->
      <template v-else>
        <div class="flex-1 flex flex-col items-center justify-center px-4 pb-6 animate-scale-in">
          <div class="text-center">
            <!-- Success icon -->
            <div class="mb-6">
              <div class="text-7xl">💀</div>
            </div>

            <!-- Title -->
            <p class="text-2xl font-bold text-white/70 mb-2">Tir effectué</p>

            <!-- Subtitle -->
            <p class="text-lg text-white/40">Tu as tiré ton dernier coup</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bg-gradient-radial {
  background: radial-gradient(ellipse at top, var(--tw-gradient-stops));
}
</style>
