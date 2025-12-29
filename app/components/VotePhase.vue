<script setup lang="ts">
import type { Database } from '~/types/database.types'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: Player
  alivePlayers: Player[]
}>()

/* --- States --- */
const selectedTarget = ref<string | null>(null)
const hasVoted = ref(false)
const isSubmitting = ref(false)

/* --- Computed --- */
const targets = computed(() =>
  props.alivePlayers.filter(p => p.id !== props.currentPlayer.id)
)

/* --- Methods --- */
async function submitVote() {
  if (!selectedTarget.value || hasVoted.value) return

  isSubmitting.value = true

  try {
    await $fetch('/api/game/vote', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        voterId: props.currentPlayer.id,
        playerToken: localStorage.getItem('playerToken'),
        targetId: selectedTarget.value
      }
    })

    hasVoted.value = true
  }
  catch (e) {
    console.error('Vote failed:', e)
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Vote header -->
    <div class="text-center py-8">
      <div class="text-4xl mb-2">
        🗳️
      </div>
      <h2 class="text-xl font-semibold">
        Vote
      </h2>
      <p class="text-gray-400">
        Qui doit être éliminé ?
      </p>
    </div>

    <!-- Dead player view -->
    <UCard v-if="!currentPlayer.is_alive" class="text-center">
      <div class="text-4xl mb-2">
        💀
      </div>
      <p class="text-gray-400">
        Tu es mort. Tu ne peux pas voter.
      </p>
    </UCard>

    <!-- Vote form -->
    <template v-else-if="!hasVoted">
      <UCard>
        <template #header>
          <span class="font-semibold">Choisis qui éliminer</span>
        </template>

        <div class="grid gap-2">
          <UButton
            v-for="target in targets"
            :key="target.id"
            :color="selectedTarget === target.id ? 'primary' : 'neutral'"
            :variant="selectedTarget === target.id ? 'solid' : 'outline'"
            block
            size="lg"
            @click="selectedTarget = target.id"
          >
            {{ target.name }}
          </UButton>
        </div>

        <template #footer>
          <UButton
            color="error"
            block
            size="lg"
            :disabled="!selectedTarget"
            :loading="isSubmitting"
            @click="submitVote"
          >
            Voter
          </UButton>
        </template>
      </UCard>
    </template>

    <!-- Vote submitted -->
    <UCard v-else class="text-center">
      <div class="text-4xl mb-2">
        ✅
      </div>
      <p class="text-gray-400">
        Vote enregistré. Attends les autres joueurs.
      </p>
    </UCard>
  </div>
</template>
