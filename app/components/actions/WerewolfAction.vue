<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import type { Player } from '#shared/types/game'

type Game = Database['public']['Tables']['games']['Row']
type DbPlayer = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: DbPlayer
  targets: DbPlayer[]
  otherWerewolves: DbPlayer[]
}>()

/* --- Emits --- */
const emit = defineEmits<{
  actionDone: []
}>()

/* --- Services --- */
const toast = useToast()

/* --- States --- */
const isSubmitting = ref(false)

/* --- Methods --- */
async function selectAndSubmit(player: Player) {
  if (isSubmitting.value) return

  isSubmitting.value = true

  try {
    await $fetch('/api/game/night-action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        playerToken: localStorage.getItem('playerToken'),
        actionType: 'werewolf_vote',
        targetId: player.id
      }
    })

    toast.add({ title: `🩸 ${player.name} sera dévoré`, color: 'success' })
    emit('actionDone')
  }
  catch (e) {
    console.error('Action failed:', e)
    toast.add({ title: 'Erreur, réessaie', color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Werewolf allies -->
    <div v-if="otherWerewolves.length > 0" class="flex flex-wrap gap-2">
      <span class="text-xs text-red-400 font-medium">🐺 Meute:</span>
      <span
        v-for="wolf in otherWerewolves"
        :key="wolf.id"
        class="px-2 py-0.5 rounded-full bg-red-900/50 text-red-300 text-xs"
      >
        {{ wolf.name }}
      </span>
    </div>

    <!-- Target selection grid -->
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="target in targets"
        :key="target.id"
        class="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-red-950/50 hover:border-red-500/50 transition-all text-center disabled:opacity-50"
        :disabled="isSubmitting"
        @click="selectAndSubmit(target as unknown as Player)"
      >
        <div class="text-2xl mb-1">👤</div>
        <p class="text-white text-sm font-medium truncate">{{ target.name }}</p>
      </button>
    </div>

    <p v-if="isSubmitting" class="text-center text-neutral-500 text-sm animate-pulse">
      Envoi du vote...
    </p>
  </div>
</template>
