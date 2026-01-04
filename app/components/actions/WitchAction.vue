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
}>()

/* --- Emits --- */
const emit = defineEmits<{
  actionDone: []
}>()

/* --- Services --- */
const client = useSupabaseClient<Database>()
const toast = useToast()

/* --- States --- */
const selectedAction = ref<'heal' | 'kill' | null>(null)
const isSubmitting = ref(false)
const selectedId = ref<string | null>(null)
const wolfVictim = ref<Player | null>(null)
const isLoadingVictim = ref(true)

/* --- Computed --- */
const canHeal = computed(() => !props.currentPlayer.witch_heal_used)
const canKill = computed(() => !props.currentPlayer.witch_kill_used)

const gridColor = computed(() => {
  if (selectedAction.value === 'heal') return 'emerald' as const
  if (selectedAction.value === 'kill') return 'red' as const
  return 'emerald' as const
})

// For kill potion, exclude the wolf victim from targets (they're already dying)
const killTargets = computed(() => {
  if (!wolfVictim.value) return props.targets
  return props.targets.filter(p => p.id !== wolfVictim.value?.id)
})

/* --- Fetch wolf victim --- */
async function fetchWolfVictim() {
  isLoadingVictim.value = true
  try {
    const { data: actions } = await client
      .from('night_actions')
      .select('target_id')
      .eq('game_id', props.game.id)
      .eq('day_number', props.game.day_number)
      .eq('action_type', 'werewolf_kill')

    if (actions && actions.length > 0) {
      // Count votes for each target
      const voteCounts = new Map<string, number>()
      for (const action of actions) {
        if (action.target_id) {
          voteCounts.set(action.target_id, (voteCounts.get(action.target_id) || 0) + 1)
        }
      }

      // Find the target with most votes
      let maxVotes = 0
      let victimId: string | null = null
      for (const [targetId, count] of voteCounts) {
        if (count > maxVotes) {
          maxVotes = count
          victimId = targetId
        }
      }

      if (victimId) {
        wolfVictim.value = props.targets.find(p => p.id === victimId) || null
      }
    }
  }
  catch (e) {
    console.error('Failed to fetch wolf victim:', e)
  }
  finally {
    isLoadingVictim.value = false
  }
}

onMounted(() => {
  fetchWolfVictim()
})

/* --- Methods --- */
async function saveVictim() {
  if (isSubmitting.value || !wolfVictim.value || !canHeal.value) return

  isSubmitting.value = true

  try {
    await gameApi.submitNightAction(props.game.id, props.currentPlayer.id, 'witch_save', wolfVictim.value.id)
    toast.add({ title: `💚 ${wolfVictim.value.name} sera sauvé !`, color: 'success' })
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

async function selectTarget(player: Player) {
  if (isSubmitting.value || selectedAction.value !== 'kill') return

  selectedId.value = player.id
  isSubmitting.value = true

  try {
    await gameApi.submitNightAction(props.game.id, props.currentPlayer.id, 'witch_kill', player.id)
    toast.add({ title: `💀 ${player.name} sera empoisonné`, color: 'success' })
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

async function skipAction() {
  isSubmitting.value = true

  try {
    await gameApi.submitNightAction(props.game.id, props.currentPlayer.id, 'witch_skip')
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

function selectKillPotion() {
  if (!canKill.value) return
  selectedAction.value = 'kill'
}
</script>

<template>
  <div class="space-y-6 animate-fade-up">
    <!-- Wolf Victim Display -->
    <div v-if="!isLoadingVictim" class="space-y-4">
      <!-- Victim Info Card -->
      <div
        v-if="wolfVictim"
        class="p-4 rounded-2xl border-2 border-red-500/30 bg-red-950/20"
      >
        <p class="text-sm text-red-400/70 text-center mb-3">Les loups ont attaqué...</p>
        <div class="flex items-center justify-center gap-4">
          <div class="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center text-3xl animate-pulse">
            🩸
          </div>
          <div class="text-left">
            <p class="text-2xl font-bold text-white">{{ wolfVictim.name }}</p>
            <p class="text-red-400 text-sm">Va mourir cette nuit...</p>
          </div>
        </div>

        <!-- Save button (if heal potion available) -->
        <button
          v-if="canHeal"
          class="w-full mt-4 py-3 px-6 rounded-xl border-2 border-emerald-500 bg-emerald-950/40 text-emerald-300 font-semibold text-lg hover:bg-emerald-900/60 transition-all duration-300 disabled:opacity-50"
          :disabled="isSubmitting"
          @click="saveVictim"
        >
          <span class="mr-2">💚</span>
          Utiliser la potion de vie
        </button>
        <p v-else class="text-center text-neutral-500 text-sm mt-3">
          Potion de vie déjà utilisée
        </p>
      </div>

      <!-- No victim -->
      <div
        v-else
        class="p-4 rounded-2xl border-2 border-neutral-700/30 bg-neutral-900/20 text-center"
      >
        <p class="text-neutral-400">Personne n'a été attaqué cette nuit</p>
      </div>
    </div>

    <!-- Loading state -->
    <div v-else class="flex justify-center py-8">
      <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Kill Potion Section -->
    <div v-if="!isLoadingVictim" class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-lg font-semibold text-white/80">Potion de mort</p>
        <span
          class="px-3 py-1 rounded-full text-xs"
          :class="canKill ? 'bg-red-500/20 text-red-400' : 'bg-neutral-800 text-neutral-500'"
        >
          {{ canKill ? 'Disponible' : 'Utilisée' }}
        </span>
      </div>

      <!-- Kill potion button -->
      <button
        v-if="!selectedAction"
        class="w-full py-4 px-6 rounded-2xl border-2 transition-all duration-300"
        :class="[
          canKill
            ? 'border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-950/40'
            : 'border-neutral-700/50 bg-neutral-900/30 text-neutral-500 cursor-not-allowed'
        ]"
        :disabled="!canKill || isSubmitting"
        @click="selectKillPotion"
      >
        <span class="mr-2">💀</span>
        Empoisonner quelqu'un
      </button>

      <!-- Target selection for kill -->
      <Transition name="fade">
        <div v-if="selectedAction === 'kill'" class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-red-400 font-semibold">Qui empoisonner ?</p>
            <button
              class="text-sm text-neutral-400 hover:text-white"
              @click="selectedAction = null"
            >
              Annuler
            </button>
          </div>

          <GameTargetGrid
            :targets="killTargets"
            :disabled="isSubmitting"
            :loading="isSubmitting"
            :selected-id="selectedId"
            :current-player="currentPlayer"
            :color="gridColor"
            @select="selectTarget"
          />
        </div>
      </Transition>
    </div>

    <!-- Skip button -->
    <button
      class="w-full py-4 px-6 rounded-2xl border-2 border-white/10 bg-white/5 text-white/60 font-semibold text-lg hover:bg-white/10 hover:text-white/80 transition-all duration-300 disabled:opacity-50"
      :disabled="isSubmitting"
      @click="skipAction"
    >
      <span class="mr-2">😴</span>
      Passer mon tour
    </button>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
