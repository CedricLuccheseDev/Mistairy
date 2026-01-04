<script setup lang="ts">
import { ROLES_CONFIG } from '#shared/config/roles.config'
import { PHASE_CHECK_INTERVAL_MS, PHASE_END_BUFFER_MS } from '#shared/config/constants'
import * as gameApi from '~/services/gameApi'

/* --- Composables --- */
const { t } = useI18n()

/* --- Meta --- */
definePageMeta({
  layoutConfig: {
    showHeader: false,
    showFooter: false
  }
})

/* --- Route --- */
const route = useRoute()
const gameCode = route.params.code as string

/* --- Game State --- */
const { game, players, currentPlayer, events, isLoading, error, isHost, canStartGame, alivePlayers, otherWerewolves, refetch } = useGame(gameCode)
const supabase = useSupabaseClient()
const { isTestMode, setPlayerId } = usePlayerStorage()
const { settings: soundSettings, muteAll, unmuteAll, initForHost } = useSoundSettings()

/* --- Narrator (simplified - uses server narration_text) --- */
const narrator = useNarrator()

/* --- Narration State --- */
// Narration phases use blocking overlay
const showNarrationOverlay = ref(false)
const narrationOverlayPhase = ref<'night_intro' | 'day_intro' | null>(null)
const lastNarratedPhaseKey = ref<string | null>(null)

const {
  setupCleanupListeners,
  removeCleanupListeners,
  clearCreatedGame,
  leaveGame
} = useGameCleanup(game, currentPlayer, gameCode)

/* --- UI State --- */
const showRoleModal = ref(false)
const showPlayersModal = ref(false)
const showEventsModal = ref(false)
const showConfigModal = ref(false)

/* --- Computed --- */
const isMuted = computed(() =>
  !soundSettings.value.voiceEnabled && !soundSettings.value.ambientEnabled && !soundSettings.value.effectsEnabled
)

const roleInfo = computed(() => {
  if (!currentPlayer.value?.role) return null
  return ROLES_CONFIG[currentPlayer.value.role]
})

const phaseClass = computed(() => {
  if (!game.value) return ''
  switch (game.value.status) {
    case 'night_intro':
    case 'night': return 'bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950'
    case 'day_intro':
    case 'day': return 'bg-gradient-to-b from-amber-950/50 via-slate-950 to-slate-950'
    case 'vote': return 'bg-gradient-to-b from-orange-950/50 via-slate-950 to-slate-950'
    case 'hunter': return 'bg-gradient-to-b from-red-950/50 via-slate-950 to-slate-950'
    default: return 'bg-slate-950'
  }
})

const timerColor = computed(() => {
  if (!game.value) return 'indigo'
  switch (game.value.status) {
    case 'night': return 'indigo' as const
    case 'day': return 'amber' as const
    case 'vote': return 'orange' as const
    case 'hunter': return 'red' as const
    default: return 'indigo' as const
  }
})

const phaseDuration = computed(() => {
  if (!game.value?.settings) return 60
  const settings = game.value.settings as { night_time?: number; discussion_time?: number; vote_time?: number }
  switch (game.value.status) {
    case 'night': return settings.night_time || 30
    case 'day': return settings.discussion_time || 120
    case 'vote': return settings.vote_time || 60
    case 'hunter': return 30
    default: return 60
  }
})

// Check if narration is enabled
const isNarrationEnabled = computed(() => {
  const settings = game.value?.settings as { narration_enabled?: boolean } | null
  return settings?.narration_enabled !== false
})

// Show timer for gameplay phases (not narration phases)
const showTimer = computed(() => {
  if (!game.value?.phase_end_at) return false
  if (game.value.status === 'lobby' || game.value.status === 'finished') return false
  // Narration phases have no timer
  if (game.value.status === 'night_intro' || game.value.status === 'day_intro') return false
  return true
})

// Check if someone died during the current night (for day phase mood sound)
function hadDeathDuringNight(): boolean {
  if (!events.value || !game.value) return false
  const dayNumber = game.value.day_number
  // Check for death events from the current night (recent events)
  return events.value.some(e =>
    e.event_type === 'death' &&
    e.data &&
    (e.data as { dayNumber?: number }).dayNumber === dayNumber
  )
}

/* --- Methods --- */
function toggleMute() {
  if (isMuted.value) unmuteAll()
  else muteAll()
}

async function skipNarration() {
  narrator.stop()
  const phase = narrationOverlayPhase.value

  showNarrationOverlay.value = false
  narrationOverlayPhase.value = null

  // Transition to next phase based on current narration phase
  if (phase === 'night_intro') {
    showRoleModal.value = true
    await startNightPhase()
  }
  else if (phase === 'day_intro') {
    await startDayPhase()
  }
}

async function startNightPhase() {
  if (!isHost.value || !game.value?.id) return
  try {
    await gameApi.startNight(game.value.id)
  }
  catch (e) {
    console.error('Failed to start night phase:', e)
  }
}

async function startDayPhase() {
  if (!isHost.value || !game.value?.id) return
  try {
    await gameApi.startDay(game.value.id)
  }
  catch (e) {
    console.error('Failed to start day phase:', e)
  }
}

async function handleLeave() {
  await leaveGame()
  navigateTo('/')
}

/* --- Phase Watchers --- */
watch(() => game.value?.status, async (newStatus, oldStatus) => {
  if (!game.value || !currentPlayer.value) return

  // Create unique key for this phase to prevent duplicate narrations
  const phaseKey = `${newStatus}-${game.value.day_number}`
  if (phaseKey === lastNarratedPhaseKey.value) return
  lastNarratedPhaseKey.value = phaseKey

  // Handle ambient sounds
  if (newStatus === 'night_intro' || newStatus === 'night') {
    narrator.ambient.startNight()
  }
  else if (newStatus === 'day_intro' || newStatus === 'day') {
    narrator.ambient.startDay()
  }
  else if (newStatus === 'vote') {
    narrator.ambient.startVote()
  }
  else if (newStatus === 'finished') {
    narrator.ambient.stop()
  }

  // Handle narration overlays for blocking phases
  // TTS is non-blocking (fire-and-forget) - host uses skip button to proceed
  if (newStatus === 'night_intro' && isNarrationEnabled.value) {
    showNarrationOverlay.value = true
    narrationOverlayPhase.value = 'night_intro'
    // Play TTS from server narration_text (fire-and-forget, don't block)
    if (game.value.narration_text) {
      narrator.speak(game.value.narration_text, { voiceType: 'story' }).catch((e) => {
        console.error('TTS failed:', e)
      })
    }
    // Host must click skip button to proceed - TTS doesn't block game flow
  }
  else if (newStatus === 'day_intro' && isNarrationEnabled.value) {
    showNarrationOverlay.value = true
    narrationOverlayPhase.value = 'day_intro'

    // Play mood sound based on deaths during the night
    if (hadDeathDuringNight()) {
      narrator.ambient.playSad()
    }
    else {
      narrator.ambient.playHappy()
    }

    // Play TTS from server narration_text (fire-and-forget, don't block)
    if (game.value.narration_text) {
      narrator.speak(game.value.narration_text, { voiceType: 'story' }).catch((e) => {
        console.error('TTS failed:', e)
      })
    }
    // Host must click skip button to proceed - TTS doesn't block game flow
  }
  // For gameplay phases (night/day/vote/hunter) - play TTS inline, no overlay
  else if (['night', 'day', 'vote', 'hunter'].includes(newStatus as string)) {
    // Hide narration overlay when transitioning from intro phases (for all players)
    if (showNarrationOverlay.value) {
      narrator.stop() // Stop any ongoing TTS
      showNarrationOverlay.value = false
      narrationOverlayPhase.value = null
    }

    // Play TTS for narration text if available
    if (game.value.narration_text && isNarrationEnabled.value) {
      try {
        await narrator.speak(game.value.narration_text, { voiceType: 'story' })
      }
      catch (e) {
        console.error('TTS failed:', e)
      }
    }
  }

  // Show role modal when night_intro transitions to night
  if (newStatus === 'night' && oldStatus === 'night_intro' && !showRoleModal.value) {
    showRoleModal.value = true
  }
})

// Watch for night role changes to play role-specific narration
watch(() => game.value?.current_night_role, async (newRole, oldRole) => {
  if (!game.value || !newRole || newRole === oldRole) return
  if (game.value.status !== 'night') return

  // Play role-specific sound effect
  if (newRole === 'werewolf') narrator.ambient.playWerewolves()
  else if (newRole === 'seer') narrator.ambient.playSeer()
  else if (newRole === 'witch') narrator.ambient.playWitch()
  else if (newRole === 'hunter') narrator.ambient.playHunter()

  // Play TTS for the new role's narration
  if (game.value.narration_text && isNarrationEnabled.value) {
    try {
      await narrator.speak(game.value.narration_text, { voiceType: 'story' })
    }
    catch (e) {
      console.error('TTS failed:', e)
    }
  }
})

watch(() => currentPlayer.value?.role, (role) => {
  if (role && game.value?.status !== 'lobby') {
    showRoleModal.value = true
  }
})

watch(isHost, (host) => {
  if (host) initForHost()
}, { immediate: true })

/* --- Auto Phase Transition --- */
let phaseCheckInterval: ReturnType<typeof setInterval> | null = null
const isCheckingPhase = ref(false)

async function checkPhaseTransition() {
  // Only host triggers phase transitions
  if (!isHost.value) return
  if (!game.value?.id || !game.value.phase_end_at || isCheckingPhase.value) return
  if (game.value.status === 'lobby' || game.value.status === 'finished') return

  const phaseEndAt = new Date(game.value.phase_end_at).getTime()
  if (Date.now() < phaseEndAt - PHASE_END_BUFFER_MS) return

  isCheckingPhase.value = true
  try {
    await gameApi.checkPhase(game.value.id)
    await refetch()
  }
  catch (e) {
    console.error('Phase check failed:', e)
  }
  finally {
    isCheckingPhase.value = false
  }
}

// Only host polls for phase transitions - other clients get updates via Realtime
watch([() => game.value?.status, isHost], ([status, host]) => {
  if (phaseCheckInterval) {
    clearInterval(phaseCheckInterval)
    phaseCheckInterval = null
  }

  // Only start polling if: host + game active + not in lobby/finished
  if (host && status && status !== 'lobby' && status !== 'finished') {
    phaseCheckInterval = setInterval(checkPhaseTransition, PHASE_CHECK_INTERVAL_MS)
  }
}, { immediate: true })

/* --- Join Handlers --- */
async function handleJoined(playerId: string) {
  setPlayerId(playerId)
  clearCreatedGame()
  await refetch()
}

async function handleGoogleCallback() {
  if (route.query.auth !== 'google') return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Joueur'
  try {
    const response = await gameApi.joinGame(gameCode, displayName)
    if (response.playerId) {
      setPlayerId(response.playerId)
      clearCreatedGame()
    }
    await refetch()
    window.history.replaceState({}, '', `/game/${gameCode}`)
  }
  catch (e) {
    console.error('Google join error:', e)
  }
}

/* --- Lifecycle --- */
onMounted(() => {
  setupCleanupListeners()
  handleGoogleCallback()
})

onUnmounted(() => {
  if (phaseCheckInterval) clearInterval(phaseCheckInterval)
  narrator.ambient.stop()
  narrator.stop()
  removeCleanupListeners()
})
</script>

<template>
  <div class="min-h-screen transition-all duration-1000" :class="phaseClass">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 relative overflow-hidden">
      <!-- Background glow orbs -->
      <div class="absolute w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl -top-48 -left-48 animate-pulse" />
      <div class="absolute w-80 h-80 rounded-full bg-violet-500/10 blur-3xl -bottom-40 -right-40 animate-pulse" style="animation-delay: 1s" />
      <div class="absolute w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style="animation-delay: 2s" />

      <!-- Sparkles -->
      <div
        v-for="i in 20"
        :key="`sparkle-${i}`"
        class="absolute w-1 h-1 rounded-full bg-indigo-300/60 animate-sparkle-loading"
        :style="{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 4}s`,
          animationDuration: `${2 + Math.random() * 3}s`
        }"
      />

      <!-- Loading content -->
      <div class="text-center animate-fade-up relative z-10">
        <div class="relative inline-block">
          <!-- Glow behind wolf -->
          <div class="absolute inset-0 text-8xl blur-xl opacity-30 animate-pulse">🐺</div>
          <div class="text-8xl mb-6 animate-float relative">🐺</div>
        </div>
        <!-- Animated loading text -->
        <div class="flex items-center justify-center gap-1.5">
          <span class="text-indigo-400 text-sm">{{ t.loading.replace('...', '') }}</span>
          <span class="flex gap-0.5">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style="animation-delay: 0ms" />
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style="animation-delay: 150ms" />
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style="animation-delay: 300ms" />
          </span>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center min-h-screen p-6">
      <div class="text-6xl mb-4">😵</div>
      <p class="text-red-400 mb-6 text-center">{{ error }}</p>
      <UButton to="/" color="neutral" variant="outline" size="lg">{{ t.back }}</UButton>
    </div>

    <!-- Join Form -->
    <LobbyJoinForm
      v-else-if="!currentPlayer && game"
      :game="game"
      :players="players"
      :game-code="gameCode"
      @joined="handleJoined"
    />

    <!-- Main Game Interface -->
    <template v-else-if="game && currentPlayer">
      <div class="min-h-screen flex flex-col">
        <!-- Background Particles (only during night phases - look like stars) -->
        <GamePhaseParticles
          v-if="game.status === 'night' || game.status === 'night_intro'"
          :phase="game.status"
          intensity="medium"
        />

        <!-- Single-line Header -->
        <div class="px-4 py-4 flex items-center gap-2">
          <!-- Left: Home + Phase badge -->
          <div class="flex items-center gap-2 shrink-0">
            <NuxtLink
              to="/"
              class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              🐺
            </NuxtLink>
            <GamePhaseProgressBar
              v-if="game.status !== 'lobby' && game.status !== 'finished'"
              :status="game.status"
              :day-number="game.day_number"
            />
          </div>

          <!-- Center: Timer (takes remaining space) -->
          <div class="flex-1 min-w-0">
            <GameProgressTimer
              v-if="showTimer"
              :end-at="game.phase_end_at!"
              :total-duration="phaseDuration"
              :phase-color="timerColor"
            />
          </div>

          <!-- Right: Action buttons -->
          <div v-if="game.status !== 'lobby'" class="flex items-center gap-1 shrink-0">
            <button
              class="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              @click="showPlayersModal = true"
            >
              <span class="text-sm">👥</span>
              <span class="text-xs text-neutral-300 tabular-nums">{{ alivePlayers.length }}/{{ players.length }}</span>
            </button>
            <button
              class="w-8 h-8 rounded-lg border transition-all cursor-pointer flex items-center justify-center text-sm"
              :class="isMuted ? 'bg-red-500/20 border-red-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'"
              @click="toggleMute"
            >
              {{ isMuted ? '🔇' : '🔊' }}
            </button>
            <button
              class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center text-sm"
              @click="showEventsModal = true"
            >
              📜
            </button>
          </div>
        </div>

        <!-- Center Content -->
        <div class="flex-1 flex flex-col items-center justify-center px-4 pb-32 overflow-visible">
          <LobbyView
            v-if="game.status === 'lobby'"
            :game="game"
            :players="players"
            :current-player="currentPlayer"
            :is-host="isHost"
            :can-start-game="canStartGame"
            :is-test-mode="isTestMode"
            @leave="handleLeave"
            @show-config="showConfigModal = true"
          />

          <template v-else>
            <!-- Inline narrator box for gameplay phases -->
            <NarrationNarratorBox
              v-if="(game.status === 'night' || game.status === 'day' || game.status === 'vote' || game.status === 'hunter') && game.narration_text"
              :text="game.narration_text"
              :phase="game.status"
            />

            <PhasesGamePhases
              :game="game"
              :current-player="currentPlayer"
              :players="players"
              :alive-players="alivePlayers"
              :other-werewolves="otherWerewolves"
            />
          </template>
        </div>

        <!-- Bottom Bar: Player Info -->
        <GamePlayerFooter
          v-if="game.status !== 'lobby'"
          :player="currentPlayer"
          :other-werewolves="otherWerewolves"
          @click="showRoleModal = true"
        />
      </div>

      <!-- Narration Overlay (only for intro and day) -->
      <NarrationOverlay
        v-if="showNarrationOverlay && narrationOverlayPhase"
        :phase="narrationOverlayPhase"
        :text="game.narration_text || ''"
        :is-host="isHost"
        @skip="skipNarration"
      />
    </template>

    <!-- Modals -->
    <UModal v-model:open="showRoleModal">
      <template #content>
        <div v-if="roleInfo" class="p-6 text-center">
          <div
            class="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-4"
            :class="roleInfo.team === 'werewolf' ? 'bg-red-900/50' : 'bg-violet-900/50'"
          >
            {{ roleInfo.emoji }}
          </div>
          <h2 class="text-2xl font-bold text-white mb-1">{{ roleInfo.name }}</h2>
          <p class="text-sm mb-4" :class="roleInfo.team === 'werewolf' ? 'text-red-400' : 'text-violet-400'">
            {{ roleInfo.team === 'werewolf' ? t.teamWerewolf : t.teamVillage }}
          </p>
          <p class="text-neutral-400 text-sm mb-6">{{ roleInfo.description }}</p>

          <div
            v-if="currentPlayer?.role === 'werewolf' && otherWerewolves.length > 0"
            class="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-800/30"
          >
            <p class="text-xs text-red-400 mb-2">🐺 {{ t.yourPack }}</p>
            <div class="flex flex-wrap gap-2 justify-center">
              <span
                v-for="wolf in otherWerewolves"
                :key="wolf.id"
                class="px-3 py-1 rounded-full bg-red-900/50 text-red-300 text-sm"
              >
                {{ wolf.name }}
              </span>
            </div>
          </div>

          <button
            class="w-full px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-colors"
            @click="showRoleModal = false"
          >
            {{ t.understood }}
          </button>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showPlayersModal">
      <template #content>
        <div class="p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-white">{{ t.players }} ({{ alivePlayers.length }}/{{ players.length }})</h3>
            <button class="text-neutral-500 hover:text-white text-xl" @click="showPlayersModal = false">x</button>
          </div>
          <GamePlayersList
            :players="players"
            :current-player-id="currentPlayer?.id"
            :show-roles="game?.status === 'finished'"
          />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showEventsModal">
      <template #content>
        <div class="p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-white">{{ t.journal }}</h3>
            <button class="text-neutral-500 hover:text-white text-xl" @click="showEventsModal = false">x</button>
          </div>
          <GameEventLog :events="events" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showConfigModal">
      <template #content>
        <div class="p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-white">{{ t.configuration }}</h3>
            <button class="text-neutral-500 hover:text-white text-xl" @click="showConfigModal = false">x</button>
          </div>
          <LobbyGameConfig
            v-if="game"
            :game-id="game.id"
            :current-settings="game.settings as any"
            @saved="showConfigModal = false; refetch()"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
@keyframes sparkle-loading {
  0%, 100% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-sparkle-loading {
  animation: sparkle-loading ease-in-out infinite;
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-fade-up {
  animation: fade-up 0.6s ease-out;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
