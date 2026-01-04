<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { getNightRoleUI } from '#shared/config/roles.config'
import type { NightRole } from '#shared/types/game'

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

/* --- Computed --- */
// Use game.current_night_role directly from the server
const currentActiveRole = computed((): NightRole | 'waiting' => {
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

// Get role UI config from centralized source
const config = computed(() => getNightRoleUI(currentActiveRole.value))

// Simplified wait message - only show if player is dead or has acted
const waitMessage = computed(() => {
  if (!props.currentPlayer.is_alive) return { icon: '💀', title: 'Éliminé', subtitle: 'Tu observes depuis l\'au-delà...' }
  if (hasActed.value) return { icon: '✓', title: 'Action faite', subtitle: 'Attends les autres...' }
  return null // No message needed - role header already shows what's happening
})

/* --- Watchers --- */
// Reset state when day_number changes (new night)
watch(() => props.game.day_number, () => {
  hasActed.value = false
  seerResult.value = null
})

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
      :style="{ '--tw-gradient-from': config.glowColor.replace('0.5', '0.2') }"
    />

    <!-- Icon glow (radial gradient) -->
    <Teleport v-if="showActionUI" to="body">
      <div
        class="fixed inset-0 pointer-events-none -z-10 transition-opacity duration-500"
        :style="{
          background: `radial-gradient(ellipse 80% 60% at 50% 33%, ${config.glowColor} 0%, transparent 70%)`
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
          :class="config.textColor"
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
          :class="[config.bgColor, config.textColor]"
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

        <!-- Waiting State (only shown for dead players or after acting) -->
        <template v-else-if="waitMessage">
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

        <!-- Default: Just show the role header (already displayed above) -->
        <template v-else>
          <div class="flex-1" />
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
