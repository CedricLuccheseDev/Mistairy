<script setup lang="ts">
import type { Game, Player } from '#shared/types/game'

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: Player
  alivePlayers: Player[]
}>()

/* --- States --- */
const selectedTarget = ref<string | null>(null)
const isSubmitting = ref(false)
const hasActed = ref(false)

/* --- Computed --- */
const isHunter = computed(() => {
  return props.game.hunter_target_pending === props.currentPlayer.id
})

const validTargets = computed(() => {
  // Hunter can shoot any alive player except themselves
  return props.alivePlayers.filter(p => p.id !== props.currentPlayer.id)
})

/* --- Methods --- */
async function shootTarget() {
  if (!selectedTarget.value || isSubmitting.value || hasActed.value) return

  isSubmitting.value = true
  try {
    await $fetch('/api/game/hunter-action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        targetId: selectedTarget.value
      }
    })
    hasActed.value = true
  }
  catch (error) {
    console.error('Hunter action failed:', error)
  }
  finally {
    isSubmitting.value = false
  }
}

async function skipShot() {
  if (isSubmitting.value || hasActed.value) return

  isSubmitting.value = true
  try {
    await $fetch('/api/game/hunter-action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        targetId: null
      }
    })
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
  <div class="text-center py-8">
    <!-- Hunter's turn -->
    <template v-if="isHunter && !hasActed">
      <div class="mb-6">
        <div class="text-6xl mb-4">🏹</div>
        <h2 class="text-2xl font-bold text-red-400 mb-2">
          Tu es mort, chasseur !
        </h2>
        <p class="text-neutral-300">
          Dans ton dernier souffle, tu peux emporter quelqu'un avec toi.
        </p>
      </div>

      <!-- Target selection -->
      <div class="space-y-3 max-w-md mx-auto mb-6">
        <button
          v-for="player in validTargets"
          :key="player.id"
          class="w-full p-4 rounded-xl border-2 transition-all duration-200"
          :class="[
            selectedTarget === player.id
              ? 'border-red-500 bg-red-500/20 text-white'
              : 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-500'
          ]"
          @click="selectedTarget = player.id"
        >
          <span class="text-lg">{{ player.name }}</span>
        </button>
      </div>

      <!-- Actions -->
      <div class="flex gap-4 justify-center">
        <UButton
          color="error"
          size="lg"
          :disabled="!selectedTarget || isSubmitting"
          :loading="isSubmitting"
          @click="shootTarget"
        >
          🔫 Tirer !
        </UButton>

        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          :disabled="isSubmitting"
          @click="skipShot"
        >
          Passer
        </UButton>
      </div>
    </template>

    <!-- Other players wait -->
    <template v-else-if="!isHunter">
      <div class="mb-6">
        <div class="text-6xl mb-4 animate-pulse">🏹</div>
        <h2 class="text-xl font-semibold text-neutral-200 mb-2">
          Le chasseur choisit sa cible...
        </h2>
        <p class="text-neutral-400">
          Dans son dernier souffle, il peut emporter quelqu'un avec lui.
        </p>
      </div>

      <div class="flex items-center justify-center gap-2 text-neutral-500">
        <UIcon name="i-heroicons-clock" class="w-5 h-5 animate-spin" />
        <span>En attente de sa décision...</span>
      </div>
    </template>

    <!-- Action completed -->
    <template v-else>
      <div class="mb-6">
        <div class="text-6xl mb-4">💀</div>
        <h2 class="text-xl font-semibold text-neutral-200">
          Tu as tiré ton dernier coup.
        </h2>
      </div>
    </template>
  </div>
</template>
