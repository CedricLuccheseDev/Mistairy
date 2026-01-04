<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import * as gameApi from '~/services/gameApi'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: Player
  targets: Player[]
  otherWerewolves: Player[]
}>()

/* --- Emits --- */
const emit = defineEmits<{
  actionDone: []
}>()

/* --- Services --- */
const toast = useToast()

/* --- States --- */
const isSubmitting = ref(false)
const selectedId = ref<string | null>(null)

/* --- Methods --- */
async function selectTarget(player: Player) {
  if (isSubmitting.value) return

  selectedId.value = player.id
  isSubmitting.value = true

  try {
    await gameApi.submitNightAction(props.game.id, props.currentPlayer.id, 'werewolf_kill', player.id)
    toast.add({ title: `🩸 ${player.name} sera dévoré`, color: 'success' })
    emit('actionDone')
  }
  catch (e) {
    console.error('Action failed:', e)
    toast.add({ title: 'Erreur, réessaie', color: 'error' })
    selectedId.value = null
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="animate-fade-up">
    <GameTargetGrid
      :targets="targets"
      :disabled="isSubmitting"
      :loading="isSubmitting"
      :selected-id="selectedId"
      :current-player="currentPlayer"
      :recognized-player-ids="otherWerewolves.map(w => w.id)"
      color="red"
      @select="selectTarget"
    />
  </div>
</template>
