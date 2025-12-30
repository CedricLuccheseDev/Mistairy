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
}>()

/* --- Emits --- */
const emit = defineEmits<{
  actionDone: []
}>()

/* --- Services --- */
const toast = useToast()

/* --- States --- */
const selectedAction = ref<'heal' | 'kill' | null>(null)
const isSubmitting = ref(false)

/* --- Computed --- */
const canHeal = computed(() => !props.currentPlayer.witch_heal_used)
const canKill = computed(() => !props.currentPlayer.witch_kill_used)

/* --- Methods --- */
async function selectAndSubmit(player: Player) {
  if (isSubmitting.value || !selectedAction.value) return

  const actionType = selectedAction.value === 'heal' ? 'witch_heal' : 'witch_kill'
  isSubmitting.value = true

  try {
    await $fetch('/api/game/night-action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        playerToken: localStorage.getItem('playerToken'),
        actionType,
        targetId: player.id
      }
    })

    const msg = selectedAction.value === 'heal' ? `💚 ${player.name} sera sauvé` : `💀 ${player.name} sera empoisonné`
    toast.add({ title: msg, color: 'success' })
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

async function skipAction() {
  isSubmitting.value = true

  try {
    await $fetch('/api/game/night-action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        playerToken: localStorage.getItem('playerToken'),
        actionType: 'witch_skip',
        targetId: null
      }
    })

    toast.add({ title: '😴 Tu passes ton tour', color: 'info' })
    emit('actionDone')
  }
  catch (e) {
    console.error('Action failed:', e)
    emit('actionDone')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Potions selection -->
    <div class="grid grid-cols-2 gap-2">
      <button
        class="p-3 rounded-xl border text-center transition-all"
        :class="[
          canHeal
            ? selectedAction === 'heal'
              ? 'border-green-500 bg-green-950/50'
              : 'border-green-500/30 bg-green-950/20 hover:bg-green-950/30'
            : 'border-neutral-700 bg-neutral-900/50 opacity-40 cursor-not-allowed'
        ]"
        :disabled="!canHeal"
        @click="canHeal && (selectedAction = 'heal')"
      >
        <div class="text-2xl mb-1">💚</div>
        <p class="text-sm font-medium" :class="canHeal ? 'text-green-400' : 'text-neutral-500'">
          Vie
        </p>
      </button>

      <button
        class="p-3 rounded-xl border text-center transition-all"
        :class="[
          canKill
            ? selectedAction === 'kill'
              ? 'border-red-500 bg-red-950/50'
              : 'border-red-500/30 bg-red-950/20 hover:bg-red-950/30'
            : 'border-neutral-700 bg-neutral-900/50 opacity-40 cursor-not-allowed'
        ]"
        :disabled="!canKill"
        @click="canKill && (selectedAction = 'kill')"
      >
        <div class="text-2xl mb-1">💀</div>
        <p class="text-sm font-medium" :class="canKill ? 'text-red-400' : 'text-neutral-500'">
          Mort
        </p>
      </button>
    </div>

    <!-- Target selection grid -->
    <template v-if="selectedAction">
      <p class="text-sm text-neutral-400">
        {{ selectedAction === 'heal' ? 'Qui sauver ?' : 'Qui empoisonner ?' }}
      </p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="target in targets"
          :key="target.id"
          class="p-3 rounded-xl border border-white/10 bg-white/5 transition-all text-center disabled:opacity-50"
          :class="selectedAction === 'heal' ? 'hover:bg-green-950/50 hover:border-green-500/50' : 'hover:bg-red-950/50 hover:border-red-500/50'"
          :disabled="isSubmitting"
          @click="selectAndSubmit(target as unknown as Player)"
        >
          <div class="text-2xl mb-1">👤</div>
          <p class="text-white text-sm font-medium truncate">{{ target.name }}</p>
        </button>
      </div>
    </template>

    <!-- Skip button -->
    <button
      class="w-full p-3 rounded-xl border border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 transition-all disabled:opacity-50"
      :disabled="isSubmitting"
      @click="skipAction"
    >
      😴 Passer
    </button>
  </div>
</template>
