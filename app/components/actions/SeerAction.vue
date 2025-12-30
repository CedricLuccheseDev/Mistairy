<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import type { Player } from '#shared/types/game'
import { ROLES } from '#shared/types/game'

type Game = Database['public']['Tables']['games']['Row']
type DbPlayer = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: DbPlayer
  targets: DbPlayer[]
}>()

/* --- Emits --- */
const emit = defineEmits<{
  actionDone: [result: { name: string; role: string; emoji: string }]
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
    const response = await $fetch('/api/game/night-action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        playerToken: localStorage.getItem('playerToken'),
        actionType: 'seer_look',
        targetId: player.id
      }
    })

    if ('revealedRole' in response && response.revealedRole) {
      const revealedRole = response.revealedRole as keyof typeof ROLES
      const roleInfo = ROLES[revealedRole]

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
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Target selection grid -->
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="target in targets"
        :key="target.id"
        class="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-violet-950/50 hover:border-violet-500/50 transition-all text-center disabled:opacity-50"
        :disabled="isSubmitting"
        @click="selectAndSubmit(target as unknown as Player)"
      >
        <div class="text-2xl mb-1">👤</div>
        <p class="text-white text-sm font-medium truncate">{{ target.name }}</p>
      </button>
    </div>

    <p v-if="isSubmitting" class="text-center text-neutral-500 text-sm animate-pulse">
      Consultation des esprits...
    </p>
  </div>
</template>
