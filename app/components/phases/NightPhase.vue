<script setup lang="ts">
import type { Database } from '#shared/types/database.types'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: Player
  alivePlayers: Player[]
  otherWerewolves: Player[]
}>()

/* --- States --- */
const hasActed = ref(false)
const seerResult = ref<{ name: string; role: string; emoji: string } | null>(null)
const nightActions = ref<{ action_type: string }[]>([])

/* --- Services --- */
const client = useSupabaseClient<Database>()

async function fetchNightActions() {
  const { data } = await client
    .from('night_actions')
    .select('action_type')
    .eq('game_id', props.game.id)
    .eq('day_number', props.game.day_number)

  if (data) nightActions.value = data
}

onMounted(() => fetchNightActions())

watch(() => props.game.day_number, () => {
  fetchNightActions()
  hasActed.value = false
  seerResult.value = null
})

/* --- Role config --- */
const roleConfig = {
  werewolf: { icon: '🐺', label: 'Les Loups-Garous', action: 'choisissent leur victime...', bg: 'bg-red-950/50', border: 'border-red-500/30', text: 'text-red-400' },
  seer: { icon: '🔮', label: 'La Voyante', action: 'observe le village...', bg: 'bg-violet-950/50', border: 'border-violet-500/30', text: 'text-violet-400' },
  witch: { icon: '🧪', label: 'La Sorcière', action: 'prépare ses potions...', bg: 'bg-emerald-950/50', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  waiting: { icon: '⏳', label: 'En attente', action: 'Transition...', bg: 'bg-neutral-900/50', border: 'border-neutral-500/30', text: 'text-neutral-400' }
}

/* --- Computed --- */
const currentActiveRole = computed((): 'werewolf' | 'seer' | 'witch' | 'waiting' => {
  const hasWerewolfAction = nightActions.value.some(a => a.action_type === 'werewolf_vote')
  const hasSeerAction = nightActions.value.some(a => a.action_type === 'seer_look')
  const hasWitchAction = nightActions.value.some(a => ['witch_heal', 'witch_kill', 'witch_skip'].includes(a.action_type))

  const hasWerewolves = props.alivePlayers.some(p => p.role === 'werewolf')
  const hasSeer = props.alivePlayers.some(p => p.role === 'seer')
  const hasWitch = props.alivePlayers.some(p => p.role === 'witch')

  // Order: Seer (Voyante) → Werewolf (Loup-Garou) → Witch (Sorcière)
  if (hasSeer && !hasSeerAction) return 'seer'
  if (hasWerewolves && !hasWerewolfAction) return 'werewolf'
  if (hasWitch && !hasWitchAction) return 'witch'
  return 'waiting'
})

const isMyTurn = computed(() => props.currentPlayer.is_alive && props.currentPlayer.role === currentActiveRole.value)

const canAct = computed(() => {
  if (hasActed.value || !props.currentPlayer.is_alive) return false
  if (props.currentPlayer.role === 'werewolf' || props.currentPlayer.role === 'seer') return true
  if (props.currentPlayer.role === 'witch') return !props.currentPlayer.witch_heal_used || !props.currentPlayer.witch_kill_used
  return false
})

const targets = computed(() => {
  if (props.currentPlayer.role === 'werewolf') return props.alivePlayers.filter(p => p.role !== 'werewolf')
  if (props.currentPlayer.role === 'seer' || props.currentPlayer.role === 'witch') return props.alivePlayers.filter(p => p.id !== props.currentPlayer.id)
  return []
})

const showActionUI = computed(() => canAct.value && isMyTurn.value && !hasActed.value)
const config = computed(() => roleConfig[currentActiveRole.value])

const waitMessage = computed(() => {
  if (!props.currentPlayer.is_alive) return { icon: '💀', title: 'Éliminé', subtitle: 'Tu observes en silence...' }
  if (props.currentPlayer.role === 'villager') return { icon: '😴', title: 'Le village dort', subtitle: 'Tu te reposes paisiblement.' }
  if (props.currentPlayer.role === 'hunter') return { icon: '🏹', title: 'Chasseur', subtitle: 'Pas d\'action de nuit.' }
  if (hasActed.value) return { icon: '✓', title: 'Action effectuée', subtitle: 'Attends les autres...' }
  return { icon: '⏳', title: 'Patiente...', subtitle: 'Ce n\'est pas encore ton tour.' }
})

/* --- Methods --- */
function onActionDone() {
  hasActed.value = true
  setTimeout(fetchNightActions, 500)
}

function onSeerResult(result: { name: string; role: string; emoji: string }) {
  seerResult.value = result
  hasActed.value = true
  setTimeout(fetchNightActions, 500)
}
</script>

<template>
  <div
    class="rounded-2xl border backdrop-blur-sm overflow-hidden transition-all duration-500"
    :class="[config.bg, config.border]"
  >
    <!-- Header -->
    <div class="p-4 border-b border-white/10">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
          :class="[config.bg, showActionUI ? 'animate-pulse' : 'animate-float']"
        >
          {{ config.icon }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-bold" :class="config.text">{{ config.label }}</p>
          <p class="text-neutral-500 text-sm">{{ config.action }}</p>
        </div>
        <div
          v-if="showActionUI"
          class="px-2 py-1 rounded-full text-xs font-semibold animate-pulse"
          :class="[config.bg, config.text]"
        >
          Ton tour
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <!-- Action UI -->
      <template v-if="showActionUI">
        <ActionsWerewolfAction
          v-if="currentPlayer.role === 'werewolf'"
          :game="game"
          :current-player="currentPlayer"
          :targets="targets"
          :other-werewolves="otherWerewolves"
          @action-done="onActionDone"
        />
        <ActionsSeerAction
          v-else-if="currentPlayer.role === 'seer'"
          :game="game"
          :current-player="currentPlayer"
          :targets="targets"
          @action-done="onSeerResult"
        />
        <ActionsWitchAction
          v-else-if="currentPlayer.role === 'witch'"
          :game="game"
          :current-player="currentPlayer"
          :targets="targets"
          @action-done="onActionDone"
        />
      </template>

      <!-- Seer result -->
      <template v-else-if="hasActed && seerResult">
        <div class="text-center py-4">
          <div class="text-5xl mb-3">{{ seerResult.emoji }}</div>
          <p class="text-white font-semibold text-lg">{{ seerResult.name }}</p>
          <p class="text-violet-400">{{ seerResult.role }}</p>
        </div>
      </template>

      <!-- Wait view -->
      <template v-else>
        <div class="text-center py-6">
          <div class="text-4xl mb-2 opacity-70">{{ waitMessage.icon }}</div>
          <p class="text-neutral-300 font-medium">{{ waitMessage.title }}</p>
          <p class="text-neutral-500 text-sm">{{ waitMessage.subtitle }}</p>
        </div>
      </template>
    </div>
  </div>
</template>
