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
const lastNarratedRole = ref<string | null>(null)

/* --- Services --- */
const { narrate } = useNarrator()

/* --- Role config --- */
const roleConfig = {
  werewolf: {
    icon: '🐺',
    label: 'Les Loups-Garous',
    action: 'Choisissez votre victime',
    color: 'red' as const
  },
  seer: {
    icon: '🔮',
    label: 'La Voyante',
    action: 'Découvrez un rôle',
    color: 'violet' as const
  },
  witch: {
    icon: '🧪',
    label: 'La Sorcière',
    action: 'Utilisez vos potions',
    color: 'emerald' as const
  },
  waiting: {
    icon: '🌙',
    label: 'La nuit...',
    action: 'Le village dort',
    color: 'violet' as const
  }
}

/* --- Computed --- */
// Use game.current_night_role directly from the server
const currentActiveRole = computed((): 'werewolf' | 'seer' | 'witch' | 'waiting' => {
  return props.game.current_night_role || 'waiting'
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
  if (!props.currentPlayer.is_alive) return { icon: '💀', title: 'Éliminé', subtitle: 'Tu observes depuis l\'au-delà...' }
  if (props.currentPlayer.role === 'villager') return { icon: '😴', title: 'Tu dors', subtitle: 'Le village se repose...' }
  if (props.currentPlayer.role === 'hunter') return { icon: '🏹', title: 'Chasseur', subtitle: 'Pas d\'action de nuit' }
  if (hasActed.value) return { icon: '✓', title: 'Action faite', subtitle: 'Attends les autres...' }
  return { icon: '⏳', title: 'Patiente', subtitle: 'Ce n\'est pas ton tour' }
})

/* --- Watchers --- */
// Reset state when day_number changes (new night)
watch(() => props.game.day_number, () => {
  hasActed.value = false
  seerResult.value = null
  lastNarratedRole.value = null
})

// Narrate when role changes
watch(currentActiveRole, (newRole) => {
  if (newRole === lastNarratedRole.value) return
  lastNarratedRole.value = newRole

  switch (newRole) {
    case 'seer':
      narrate.seerWake()
      break
    case 'werewolf':
      narrate.werewolvesWake()
      break
    case 'witch':
      narrate.witchWake()
      break
  }
}, { immediate: true })

/* --- Methods --- */
function onActionDone() {
  hasActed.value = true
}

function onSeerResult(result: { name: string; role: string; emoji: string }) {
  seerResult.value = result
  hasActed.value = true
}
</script>

<template>
  <div class="flex-1 flex flex-col relative min-h-0 overflow-visible">
    <!-- Background particles -->
    <GamePhaseParticles phase="night" :intensity="showActionUI ? 'high' : 'medium'" />

    <!-- Radial glow based on active role -->
    <div
      class="absolute inset-0 bg-gradient-radial pointer-events-none transition-all duration-1000"
      :class="{
        'from-red-500/20 via-transparent to-transparent': config.color === 'red',
        'from-violet-500/20 via-transparent to-transparent': config.color === 'violet',
        'from-emerald-500/20 via-transparent to-transparent': config.color === 'emerald'
      }"
    />

    <!-- Icon glow (radial gradient, no blur needed) -->
    <Teleport v-if="showActionUI" to="body">
      <div
        class="fixed inset-0 pointer-events-none -z-10 transition-opacity duration-500"
        :style="{
          background: config.color === 'red'
            ? 'radial-gradient(ellipse 80% 60% at 50% 33%, rgba(239, 68, 68, 0.5) 0%, transparent 70%)'
            : config.color === 'violet'
              ? 'radial-gradient(ellipse 80% 60% at 50% 33%, rgba(139, 92, 246, 0.5) 0%, transparent 70%)'
              : 'radial-gradient(ellipse 80% 60% at 50% 33%, rgba(16, 185, 129, 0.5) 0%, transparent 70%)'
        }"
      />
    </Teleport>

    <!-- Main Content -->
    <div class="relative z-10 flex-1 flex flex-col justify-center overflow-visible">
      <!-- Header: Active Role Info -->
      <div class="text-center pb-4 px-4 animate-fade-up">
        <!-- Role Icon -->
        <div class="inline-block mb-4">
          <div
            class="text-7xl sm:text-8xl transition-transform duration-500"
            :class="showActionUI ? 'animate-float' : 'opacity-60'"
          >
            {{ config.icon }}
          </div>
        </div>

        <!-- Role Label -->
        <h1
          class="text-3xl sm:text-4xl font-black tracking-tight mb-2 transition-colors duration-500"
          :class="{
            'text-red-400': config.color === 'red',
            'text-violet-400': config.color === 'violet',
            'text-emerald-400': config.color === 'emerald'
          }"
        >
          {{ config.label }}
        </h1>

        <!-- Action Description -->
        <p class="text-lg sm:text-xl text-white/60">
          {{ config.action }}
        </p>

        <!-- "Your turn" badge -->
        <div
          v-if="showActionUI"
          class="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full animate-pulse"
          :class="{
            'bg-red-500/20 text-red-300': config.color === 'red',
            'bg-violet-500/20 text-violet-300': config.color === 'violet',
            'bg-emerald-500/20 text-emerald-300': config.color === 'emerald'
          }"
        >
          <span class="w-2 h-2 rounded-full bg-current animate-ping" />
          <span class="font-semibold">C'est ton tour</span>
        </div>
      </div>

      <!-- Action Zone -->
      <div class="px-4 pb-6">
        <!-- Werewolf Action -->
        <template v-if="showActionUI && currentPlayer.role === 'werewolf'">
          <!-- Pack info -->
          <div v-if="otherWerewolves.length > 0" class="mb-4 text-center animate-fade-up">
            <p class="text-sm text-red-400/70 mb-2">Ta meute</p>
            <div class="flex flex-wrap justify-center gap-2">
              <span
                v-for="wolf in otherWerewolves"
                :key="wolf.id"
                class="px-3 py-1 rounded-full bg-red-900/40 text-red-300 text-sm font-medium"
              >
                🐺 {{ wolf.name }}
              </span>
            </div>
          </div>

          <ActionsWerewolfAction
            :game="game"
            :current-player="currentPlayer"
            :targets="targets"
            :other-werewolves="otherWerewolves"
            @action-done="onActionDone"
          />
        </template>

        <!-- Seer Action -->
        <template v-else-if="showActionUI && currentPlayer.role === 'seer'">
          <ActionsSeerAction
            :game="game"
            :current-player="currentPlayer"
            :targets="targets"
            @action-done="onSeerResult"
          />
        </template>

        <!-- Witch Action -->
        <template v-else-if="showActionUI && currentPlayer.role === 'witch'">
          <ActionsWitchAction
            :game="game"
            :current-player="currentPlayer"
            :targets="targets"
            @action-done="onActionDone"
          />
        </template>

        <!-- Seer Result Display -->
        <template v-else-if="hasActed && seerResult">
          <div class="relative flex-1 flex flex-col items-center justify-center py-8 animate-scale-in">
            <!-- Seer result glow (absolute, centered) -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 blur-3xl opacity-30 bg-violet-500 rounded-full pointer-events-none" />

            <div class="relative text-center">
              <!-- Revealed role icon -->
              <div class="mb-6">
                <div class="text-8xl animate-icon-bounce">{{ seerResult.emoji }}</div>
              </div>

              <!-- Player name -->
              <p class="text-2xl font-bold text-white mb-2">{{ seerResult.name }}</p>

              <!-- Role name -->
              <p class="text-xl text-violet-400">{{ seerResult.role }}</p>

              <!-- Divider -->
              <div class="w-24 h-0.5 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent mx-auto my-6" />

              <!-- Hint -->
              <p class="text-sm text-white/40">Information révélée par les esprits</p>
            </div>
          </div>
        </template>

        <!-- Waiting State -->
        <template v-else>
          <div class="flex-1 flex flex-col items-center justify-center py-12 animate-fade-up">
            <div class="text-center">
              <!-- Wait icon -->
              <div class="text-6xl mb-6 opacity-50">{{ waitMessage.icon }}</div>

              <!-- Title -->
              <p class="text-2xl font-bold text-white/70 mb-2">{{ waitMessage.title }}</p>

              <!-- Subtitle -->
              <p class="text-lg text-white/40">{{ waitMessage.subtitle }}</p>

            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-gradient-radial {
  background: radial-gradient(ellipse at top, var(--tw-gradient-stops));
}
</style>
