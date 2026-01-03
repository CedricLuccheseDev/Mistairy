<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { ROLES_CONFIG } from '#shared/config/roles.config'
import type { Role } from '#shared/types/game'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: Player
  targets: Player[]
}>()

/* --- Emits --- */
const emit = defineEmits<{
  actionDone: [result: { name: string; role: string; emoji: string }]
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
    const response = await $fetch('/api/game/action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        actionType: 'seer_view',
        targetId: player.id
      }
    })

    if ('revealedRole' in response && response.revealedRole) {
      const revealedRole = response.revealedRole as Role
      const roleInfo = ROLES_CONFIG[revealedRole]

      toast.add({ title: `${roleInfo.emoji} ${player.name} est ${roleInfo.name}`, color: 'info' })

      emit('actionDone', {
        name: player.name,
        role: roleInfo.name,
        emoji: roleInfo.emoji
      })
    }
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
      color="violet"
      @select="selectTarget"
    />
  </div>
</template>
