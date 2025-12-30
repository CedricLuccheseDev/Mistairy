<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import type { Player } from '#shared/types/game'

type Game = Database['public']['Tables']['games']['Row']
type DbPlayer = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: DbPlayer
  alivePlayers: DbPlayer[]
}>()

/* --- Services --- */
const toast = useToast()

/* --- States --- */
const hasVoted = ref(false)
const isSubmitting = ref(false)

/* --- Computed --- */
const targets = computed(() =>
  props.alivePlayers.filter(p => p.id !== props.currentPlayer.id)
)

/* --- Methods --- */
async function selectAndVote(player: Player) {
  if (hasVoted.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    await $fetch('/api/game/vote', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        voterId: props.currentPlayer.id,
        playerToken: localStorage.getItem('playerToken'),
        targetId: player.id
      }
    })

    toast.add({ title: `🗳️ Vote contre ${player.name}`, color: 'success' })
    hasVoted.value = true
  }
  catch (e) {
    console.error('Vote failed:', e)
    toast.add({ title: 'Erreur, réessaie', color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="rounded-2xl border border-orange-500/30 bg-orange-950/30 backdrop-blur-sm overflow-hidden">
    <!-- Header -->
    <div class="p-4 border-b border-white/10">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-orange-900/50 flex items-center justify-center text-2xl animate-attention">
          🗳️
        </div>
        <div class="flex-1">
          <p class="font-bold text-orange-400">Le village vote</p>
          <p class="text-neutral-500 text-sm">Qui est le loup-garou ?</p>
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

      <!-- Vote form -->
      <template v-else-if="!hasVoted">
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="target in targets"
            :key="target.id"
            class="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-orange-950/50 hover:border-orange-500/50 transition-all text-center disabled:opacity-50"
            :disabled="isSubmitting"
            @click="selectAndVote(target as unknown as Player)"
          >
            <div class="text-2xl mb-1">👤</div>
            <p class="text-white text-sm font-medium truncate">{{ target.name }}</p>
          </button>
        </div>

        <p v-if="isSubmitting" class="text-center text-neutral-500 text-sm animate-pulse mt-4">
          Envoi du vote...
        </p>
      </template>

      <!-- Vote submitted -->
      <div v-else class="text-center py-6">
        <div class="text-4xl mb-2">✅</div>
        <p class="text-green-400 font-medium">Vote enregistré</p>
        <p class="text-neutral-500 text-sm">Attends les autres...</p>
      </div>
    </div>
  </div>
</template>
