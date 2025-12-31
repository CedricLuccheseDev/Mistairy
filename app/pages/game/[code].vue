<script setup lang="ts">
import { ROLES } from '#shared/types/game'

/* --- Route --- */
const route = useRoute()
const gameCode = route.params.code as string

/* --- Game State --- */
const { game, players, currentPlayer, events, isLoading, error, isHost, canStartGame, alivePlayers, otherWerewolves, refetch } = useGame(gameCode)
const narrator = useNarrator()
const supabase = useSupabaseClient()
const { isTestMode, setPlayerId, removePlayerId, getPlayerId } = usePlayerStorage()
const { settings: soundSettings, muteAll, unmuteAll, initForHost } = useSoundSettings()

const isMuted = computed(() =>
  !soundSettings.value.voiceEnabled && !soundSettings.value.ambientEnabled && !soundSettings.value.effectsEnabled
)

function toggleMute() {
  if (isMuted.value) {
    unmuteAll()
  }
  else {
    muteAll()
  }
}

/* --- UI State --- */
const isStarting = ref(false)
const showRoleModal = ref(false)
const showPlayersModal = ref(false)
const showEventsModal = ref(false)
const showConfigModal = ref(false)
const joinName = ref('')
const isJoining = ref(false)
const joinError = ref('')
const isGoogleLoading = ref(false)
const isLeaving = ref(false)

/* --- Cleanup State (non-reactive for beforeunload) --- */
let createdGameId: string | null = null

/* --- Computed --- */
const roleInfo = computed(() => {
  if (!currentPlayer.value?.role) return null
  return ROLES[currentPlayer.value.role]
})

const phaseClass = computed(() => {
  if (!game.value) return ''
  switch (game.value.status) {
    case 'intro':
    case 'night': return 'bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950'
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
    case 'hunter': return 30 // 30 seconds for hunter to shoot
    default: return 60
  }
})

const maxPlayers = computed(() => {
  if (!game.value?.settings) return 18
  const settings = game.value.settings as { max_players?: number }
  return settings.max_players || 18
})

/* --- Methods --- */
const startError = ref<string | null>(null)

async function startGame() {
  if (!canStartGame.value) return
  isStarting.value = true
  startError.value = null
  try {
    await $fetch('/api/game/start', {
      method: 'POST',
      body: { gameId: game.value?.id, playerId: getPlayerId() }
    })
    await refetch()
  }
  catch (e: unknown) {
    const fetchError = e as { data?: { message?: string }, message?: string }
    const errorMessage = fetchError.data?.message || fetchError.message || 'Erreur lors du lancement'
    startError.value = errorMessage
    console.error('Failed to start game:', errorMessage, e)
  }
  finally {
    isStarting.value = false
  }
}

function shareLink() {
  // In test mode, share the URL without the test param (for real players)
  const baseUrl = `${window.location.origin}/game/${gameCode}`
  if (navigator.share) {
    navigator.share({ title: `Loup Agrou - ${gameCode}`, url: baseUrl })
  }
  else {
    navigator.clipboard.writeText(baseUrl)
  }
}

// Copy test URL (with ?test param) for opening another test tab
function copyTestUrl() {
  const testUrl = `${window.location.origin}/game/${gameCode}?test`
  navigator.clipboard.writeText(testUrl)
}

async function leaveGame() {
  if (!game.value || !currentPlayer.value || isLeaving.value) return
  isLeaving.value = true
  try {
    await $fetch('/api/game/leave', {
      method: 'POST',
      body: { gameId: game.value.id, playerId: currentPlayer.value.id }
    })
    removePlayerId()
    navigateTo('/')
  }
  catch (e) {
    console.error('Failed to leave game:', e)
  }
  finally {
    isLeaving.value = false
  }
}

async function joinGame() {
  if (!joinName.value.trim()) {
    joinError.value = 'Entre ton prénom'
    return
  }
  isJoining.value = true
  joinError.value = ''
  try {
    const response = await $fetch('/api/game/join', {
      method: 'POST',
      body: { playerName: joinName.value.trim(), code: gameCode }
    })
    if (response.playerId) {
      setPlayerId(response.playerId)
      // Clear created game flag since we've now joined
      sessionStorage.removeItem('createdGame')
      createdGameId = null
    }
    await refetch()
  }
  catch (e: unknown) {
    const fetchError = e as { data?: { message?: string } }
    joinError.value = fetchError.data?.message || 'Erreur lors de la connexion'
  }
  finally {
    isJoining.value = false
  }
}

async function joinWithGoogle() {
  isGoogleLoading.value = true
  joinError.value = ''

  try {
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/game/${gameCode}?auth=google`
      }
    })

    if (authError) {
      joinError.value = 'Erreur de connexion Google'
      console.error('Google auth error:', authError)
    }
  }
  catch (e) {
    joinError.value = 'Erreur de connexion Google'
    console.error('Google auth error:', e)
  }
  finally {
    isGoogleLoading.value = false
  }
}

// Handle Google OAuth callback
onMounted(async () => {
  const authParam = route.query.auth
  if (authParam === 'google') {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Joueur'
      isJoining.value = true
      try {
        const response = await $fetch('/api/game/join', {
          method: 'POST',
          body: { playerName: displayName, code: gameCode }
        })
        if (response.playerId) {
          setPlayerId(response.playerId)
          // Clear created game flag since we've now joined
          sessionStorage.removeItem('createdGame')
          createdGameId = null
        }
        await refetch()
        // Clean URL
        window.history.replaceState({}, '', `/game/${gameCode}`)
      }
      catch (e: unknown) {
        const fetchError = e as { data?: { message?: string } }
        joinError.value = fetchError.data?.message || 'Erreur lors de la connexion'
      }
      finally {
        isJoining.value = false
      }
    }
  }
})

/* --- Watchers --- */
const lastNarratedPhase = ref<string | null>(null)

const narrationPhase = ref<'intro' | 'night' | 'day' | 'vote' | null>(null)
const narrationText = ref('')

async function playPreamble() {
  if (!game.value) return

  narrationPhase.value = 'intro'

  // First get the narration text from AI (without speaking)
  let narration = ''
  try {
    const response = await $fetch<{ narration: string }>('/api/narration/generate', {
      method: 'POST',
      body: {
        context: 'night_start',
        data: {
          dayNumber: 1,
          playerCount: players.value.length,
          playerNames: players.value.map(p => p.name)
        }
      }
    })
    narration = response.narration || `Bienvenue dans ce village paisible... ${players.value.length} âmes s'apprêtent à vivre une nuit de terreur.`
  }
  catch {
    narration = `Bienvenue dans ce village paisible... ${players.value.length} âmes s'apprêtent à vivre une nuit de terreur.`
  }

  // Show the text on screen immediately
  narrationText.value = narration

  // Now speak and WAIT for the voice to finish
  await narrator.speak(narration, { rate: 0.85, voiceType: 'story' })

  // Small pause after voice ends before moving on
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Close narration overlay if not skipped
  if (narrationPhase.value === 'intro') {
    narrationPhase.value = null
    showRoleModal.value = true
  }
}

async function playNightNarration() {
  if (!game.value) return

  narrationPhase.value = 'night'

  // Get narration text
  let narration = ''
  try {
    const response = await $fetch<{ narration: string }>('/api/narration/generate', {
      method: 'POST',
      body: {
        context: 'night_start',
        data: { dayNumber: game.value.day_number, aliveCount: alivePlayers.value.length }
      }
    })
    narration = response.narration || `Nuit ${game.value.day_number}. Le village s'endort...`
  }
  catch {
    narration = `Nuit ${game.value.day_number}. Le village s'endort...`
  }

  // Show text and speak
  narrationText.value = narration
  await narrator.speak(narration, { rate: 0.85, voiceType: 'story' })
  await new Promise(resolve => setTimeout(resolve, 1000))

  if (narrationPhase.value === 'night') {
    narrationPhase.value = null
  }
}

async function playDayNarration() {
  if (!game.value) return

  narrationPhase.value = 'day'

  // Get narration text
  let narration = ''
  try {
    const response = await $fetch<{ narration: string }>('/api/narration/generate', {
      method: 'POST',
      body: {
        context: 'day_start',
        data: { dayNumber: game.value.day_number, aliveCount: alivePlayers.value.length }
      }
    })
    narration = response.narration || `Le soleil se lève sur le village...`
  }
  catch {
    narration = `Le soleil se lève sur le village...`
  }

  // Show text and speak
  narrationText.value = narration
  await narrator.speak(narration, { rate: 0.85, voiceType: 'story' })
  await new Promise(resolve => setTimeout(resolve, 1000))

  if (narrationPhase.value === 'day') {
    narrationPhase.value = null
  }
}

async function playVoteNarration() {
  if (!game.value) return

  narrationPhase.value = 'vote'

  // Get narration text
  let narration = ''
  try {
    const response = await $fetch<{ narration: string }>('/api/narration/generate', {
      method: 'POST',
      body: {
        context: 'vote_start',
        data: { dayNumber: game.value.day_number, aliveCount: alivePlayers.value.length }
      }
    })
    narration = response.narration || `L'heure du jugement a sonné...`
  }
  catch {
    narration = `L'heure du jugement a sonné...`
  }

  // Show text and speak
  narrationText.value = narration
  await narrator.speak(narration, { rate: 0.85, voiceType: 'story' })
  await new Promise(resolve => setTimeout(resolve, 1000))

  if (narrationPhase.value === 'vote') {
    narrationPhase.value = null
  }
}

function skipNarration() {
  const wasIntro = narrationPhase.value === 'intro'
  narrator.stop()
  narrationPhase.value = null
  // If it was intro, show role modal
  if (wasIntro) {
    showRoleModal.value = true
  }
}

watch(() => game.value?.status, async (newStatus, oldStatus) => {
  if (!game.value || !currentPlayer.value) return

  // Avoid narrating the same phase twice
  const phaseKey = `${newStatus}-${game.value.day_number}`
  if (lastNarratedPhase.value === phaseKey) return
  lastNarratedPhase.value = phaseKey

  // Check if narration is enabled
  const settings = game.value.settings as { narration_enabled?: boolean }
  const narrationEnabled = settings.narration_enabled !== false

  // Handle phase transitions with narration and ambient sounds
  if (newStatus === 'intro') {
    // Intro phase - play preamble narration then transition to night
    narrator.ambient.startNight()
    if (narrationEnabled) {
      await playPreamble()
    }
    else {
      showRoleModal.value = true
    }
    // Only host triggers the transition to night phase
    if (isHost.value && game.value?.id) {
      try {
        await $fetch('/api/game/start-night', {
          method: 'POST',
          body: { gameId: game.value.id }
        })
      }
      catch (e) {
        console.error('Failed to start night phase:', e)
      }
    }
  }
  else if (newStatus === 'night') {
    // Show role modal when entering night (for non-host players coming from intro)
    if (oldStatus === 'intro' && !showRoleModal.value) {
      showRoleModal.value = true
    }
    // Subsequent nights (from vote or hunter)
    if (oldStatus === 'vote' || oldStatus === 'hunter') {
      narrator.ambient.startNight()
      if (narrationEnabled) {
        await playNightNarration()
      }
    }
  }
  else if (newStatus === 'day') {
    narrator.ambient.startDay()
    if (narrationEnabled) {
      await playDayNarration()
    }
  }
  else if (newStatus === 'vote') {
    narrator.ambient.startVote()
    if (narrationEnabled) {
      await playVoteNarration()
    }
  }
  else if (newStatus === 'hunter') {
    const hunterPlayer = players.value.find(p => p.id === game.value?.hunter_target_pending)
    if (hunterPlayer && narrationEnabled) {
      await narrator.narrate.hunterDeath(hunterPlayer.name)
    }
  }
  else if (newStatus === 'finished' && game.value.winner) {
    narrator.ambient.stop()
    if (narrationEnabled) await narrator.narrate.gameEnd(game.value.winner)
  }
})

watch(() => currentPlayer.value?.role, (role) => {
  if (role && game.value?.status !== 'lobby') {
    showRoleModal.value = true
  }
})

// Enable sounds for host by default
watch(isHost, (host) => {
  if (host) {
    initForHost()
  }
}, { immediate: true })

// Watch for death announcements and vote results in events
const lastEventId = ref<string | null>(null)

watch(() => events.value, async (newEvents) => {
  if (!newEvents || newEvents.length === 0 || !game.value) return

  // Check if narration is enabled
  const settings = game.value.settings as { narration_enabled?: boolean }
  if (settings.narration_enabled === false) return

  // Get the latest event
  const latestEvent = newEvents[newEvents.length - 1]
  if (!latestEvent || latestEvent.id === lastEventId.value) return

  lastEventId.value = latestEvent.id

  // Narrate death announcements
  if (latestEvent.event_type === 'night_end') {
    const data = latestEvent.data as { dead?: Array<{ name: string }> }
    if (data.dead && data.dead.length > 0) {
      for (const victim of data.dead) {
        await narrator.narrate.death(victim.name, 'werewolves')
      }
    }
  }
  // Narrate vote results
  else if (latestEvent.event_type === 'vote_result' || latestEvent.event_type === 'player_eliminated') {
    const data = latestEvent.data as { playerName?: string; eliminated?: string }
    const victimName = data.playerName
    if (victimName) {
      await narrator.narrate.voteResult(victimName)
    }
  }
}, { deep: true })

/* --- Auto Phase Transition --- */
let phaseCheckInterval: ReturnType<typeof setInterval> | null = null
const isCheckingPhase = ref(false)

async function checkPhaseTransition() {
  if (!game.value?.id || !game.value.phase_end_at || isCheckingPhase.value) return
  if (game.value.status === 'lobby' || game.value.status === 'finished') return

  const phaseEndAt = new Date(game.value.phase_end_at).getTime()
  const now = Date.now()

  // Only check if timer has expired (with 1 second buffer)
  if (now < phaseEndAt - 1000) return

  isCheckingPhase.value = true
  try {
    await $fetch('/api/game/check-phase', {
      method: 'POST',
      body: { gameId: game.value.id }
    })
    await refetch()
  }
  catch (e) {
    console.error('Phase check failed:', e)
  }
  finally {
    isCheckingPhase.value = false
  }
}

// Start polling when game is active
watch(() => game.value?.status, (status) => {
  if (phaseCheckInterval) {
    clearInterval(phaseCheckInterval)
    phaseCheckInterval = null
  }

  if (status && status !== 'lobby' && status !== 'finished') {
    // Check every 2 seconds
    phaseCheckInterval = setInterval(checkPhaseTransition, 2000)
  }
}, { immediate: true })

onUnmounted(() => {
  if (phaseCheckInterval) {
    clearInterval(phaseCheckInterval)
  }
  // Stop ambient sounds when leaving the page
  narrator.ambient.stop()
})

/* --- Auto-leave on window close/refresh (lobby only) --- */
// Store data outside of Vue reactivity for reliable access in beforeunload
let cachedGameId: string | null = null
let cachedPlayerId: string | null = null
let cachedGameStatus: string | null = null

// Update cached values whenever game or player changes
watch([game, currentPlayer], () => {
  cachedGameId = game.value?.id || null
  cachedPlayerId = currentPlayer.value?.id || null
  cachedGameStatus = game.value?.status || null
}, { immediate: true })

// On page load, check if we need to clean up from a previous leave attempt
async function cleanupStalePlayer() {
  // Clean up orphan games from previous sessions
  const createdGame = sessionStorage.getItem('createdGame')
  if (createdGame) {
    try {
      const { gameId, code } = JSON.parse(createdGame)
      // Only clean if it's a different game (we navigated away without joining)
      if (code !== gameCode) {
        sessionStorage.removeItem('createdGame')
        await $fetch('/api/game/delete-orphan', {
          method: 'POST',
          body: { gameId }
        })
      }
      else {
        // Cache the createdGameId for use in beforeunload
        createdGameId = gameId
      }
    }
    catch {
      // Ignore errors
    }
  }

  // Clean up stale players
  const pendingLeave = sessionStorage.getItem('pendingLeave')
  if (pendingLeave) {
    sessionStorage.removeItem('pendingLeave')
    try {
      const { gameId, playerId } = JSON.parse(pendingLeave)
      await $fetch('/api/game/leave', {
        method: 'POST',
        body: { gameId, playerId }
      })
    }
    catch {
      // Ignore errors - player might already be deleted
    }
  }
}

function leaveOnClose() {
  // If creator leaves without joining, delete the orphan game
  if (createdGameId && !cachedPlayerId) {
    sessionStorage.removeItem('createdGame')
    const data = JSON.stringify({ gameId: createdGameId })
    const blob = new Blob([data], { type: 'application/json' })
    navigator.sendBeacon('/api/game/delete-orphan', blob)
    return
  }

  // Only auto-leave if in lobby phase
  if (cachedGameStatus === 'lobby' && cachedGameId && cachedPlayerId) {
    // Store pending leave in sessionStorage for cleanup on next load
    sessionStorage.setItem('pendingLeave', JSON.stringify({
      gameId: cachedGameId,
      playerId: cachedPlayerId
    }))

    const data = JSON.stringify({
      gameId: cachedGameId,
      playerId: cachedPlayerId
    })

    // Use sendBeacon - specifically designed for unload events
    const blob = new Blob([data], { type: 'application/json' })
    navigator.sendBeacon('/api/game/leave', blob)

    removePlayerId()
  }
}

function handleBeforeUnload() {
  leaveOnClose()
}

function handlePageHide(event: PageTransitionEvent) {
  // Only run if the page is being unloaded (not just hidden)
  if (event.persisted) return
  leaveOnClose()
}

onMounted(() => {
  // Clean up any stale player from previous session
  cleanupStalePlayer()

  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('pagehide', handlePageHide)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('pagehide', handlePageHide)
})
</script>

<template>
  <div class="min-h-screen transition-all duration-1000" :class="phaseClass">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="text-center animate-fade-up">
        <div class="text-8xl mb-6 animate-float">🐺</div>
        <p class="text-neutral-500 text-sm">Chargement...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center min-h-screen p-6">
      <div class="text-6xl mb-4">😵</div>
      <p class="text-red-400 mb-6 text-center">{{ error }}</p>
      <UButton to="/" color="neutral" variant="outline" size="lg">Retour</UButton>
    </div>

    <!-- Join Form -->
    <div v-else-if="!currentPlayer && game" class="min-h-screen bg-gradient-to-b from-violet-950/30 via-slate-950 to-slate-950 flex flex-col overflow-hidden">
      <!-- Background decorations -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -left-40 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
        <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s" />
        <div class="absolute top-1/3 right-1/4 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s" />
      </div>

      <!-- Header -->
      <div class="relative z-10 p-4">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <span class="text-lg">←</span>
          <span class="text-sm">Retour</span>
        </NuxtLink>
      </div>

      <!-- Content -->
      <div class="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        <div class="w-full max-w-sm">
          <!-- Logo & Game Code -->
          <div class="text-center mb-10 animate-fade-up">
            <div class="relative inline-block">
              <div class="text-8xl animate-float filter drop-shadow-2xl">🐺</div>
              <div class="absolute -inset-4 bg-violet-500/20 blur-2xl rounded-full -z-10" />
            </div>
            <h1 class="text-4xl font-black text-white mt-4 tracking-[0.2em]">{{ gameCode }}</h1>
            <div class="flex items-center justify-center gap-2 mt-3">
              <div class="flex -space-x-2">
                <div v-for="i in Math.min(players.length, 4)" :key="i" class="w-6 h-6 rounded-full bg-violet-500/30 border-2 border-slate-950 flex items-center justify-center text-xs">
                  👤
                </div>
                <div v-if="players.length > 4" class="w-6 h-6 rounded-full bg-violet-500/30 border-2 border-slate-950 flex items-center justify-center text-xs text-violet-300">
                  +{{ players.length - 4 }}
                </div>
              </div>
              <span class="text-neutral-400 text-sm">{{ players.length }} joueur{{ players.length > 1 ? 's' : '' }} en attente</span>
            </div>
          </div>

          <!-- Join Options -->
          <div v-if="game.status === 'lobby'" class="space-y-4 animate-fade-up" style="animation-delay: 0.15s">
            <!-- Name Input Card -->
            <div class="p-5 rounded-3xl bg-gradient-to-br from-violet-600/20 to-violet-900/20 border border-violet-500/30 backdrop-blur-sm">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl">
                  ✏️
                </div>
                <p class="text-white font-medium">Entre ton prénom</p>
              </div>
              <input
                v-model="joinName"
                type="text"
                placeholder="Prénom"
                autofocus
                class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg placeholder-neutral-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                @keyup.enter="joinGame"
              >
              <button
                class="w-full mt-3 px-6 py-3.5 rounded-xl bg-violet-600 text-white font-bold text-lg hover:bg-violet-500 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                :disabled="isJoining || !joinName.trim()"
                @click="joinGame"
              >
                {{ isJoining ? 'Connexion...' : 'Rejoindre la partie' }}
              </button>
            </div>

            <!-- Divider -->
            <div class="flex items-center gap-4">
              <div class="flex-1 h-px bg-white/10" />
              <span class="text-neutral-500 text-sm">ou</span>
              <div class="flex-1 h-px bg-white/10" />
            </div>

            <!-- Google Sign In Card -->
            <button
              class="group w-full p-5 rounded-3xl bg-gradient-to-br from-slate-600/20 to-slate-900/20 border border-white/10 backdrop-blur-sm transition-all hover:border-white/20 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              :disabled="isGoogleLoading"
              @click="joinWithGoogle"
            >
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                  <svg class="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="text-white font-semibold group-hover:text-violet-200 transition-colors">
                    {{ isGoogleLoading ? 'Connexion...' : 'Continuer avec Google' }}
                  </p>
                  <p class="text-neutral-500 text-sm">Connexion rapide avec ton compte</p>
                </div>
                <div v-if="!isGoogleLoading" class="text-neutral-400 group-hover:translate-x-1 transition-transform">→</div>
                <div v-else class="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </button>

            <!-- Error -->
            <Transition name="fade">
              <div v-if="joinError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center animate-shake">
                <p class="text-red-400 text-sm">{{ joinError }}</p>
              </div>
            </Transition>
          </div>

          <!-- Game already started -->
          <div v-else class="text-center animate-fade-up">
            <div class="p-6 rounded-3xl bg-orange-500/10 border border-orange-500/30 backdrop-blur-sm">
              <div class="text-5xl mb-4">🎮</div>
              <p class="text-orange-400 font-semibold mb-2">Partie en cours</p>
              <p class="text-neutral-400 text-sm mb-4">Tu ne peux plus rejoindre cette partie</p>
              <NuxtLink
                to="/"
                class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
              >
                ← Retour à l'accueil
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Game Interface -->
    <template v-else-if="game && currentPlayer">
      <div class="min-h-screen flex flex-col">
        <!-- Top Bar: Logo + Timer + Actions -->
        <div class="p-4 flex items-center gap-3">
          <!-- Logo / Home link -->
          <NuxtLink
            to="/"
            class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl hover:bg-white/10 transition-colors shrink-0"
            title="Retour à l'accueil"
          >
            🐺
          </NuxtLink>

          <!-- Timer (hidden during intro/narration) -->
          <div class="flex-1">
            <GameProgressTimer
              v-if="game.status !== 'lobby' && game.status !== 'intro' && game.status !== 'finished' && !narrationPhase && game.phase_end_at"
              :end-at="game.phase_end_at"
              :total-duration="phaseDuration"
              :phase-color="timerColor"
            />
          </div>

          <!-- Quick actions -->
          <div v-if="game.status !== 'lobby'" class="flex items-center gap-2 shrink-0">
            <button
              class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              @click="showPlayersModal = true"
            >
              <span class="text-lg">👥</span>
              <span class="text-sm text-neutral-300">{{ alivePlayers.length }}/{{ players.length }}</span>
            </button>
            <button
              class="w-10 h-10 rounded-xl border transition-colors cursor-pointer flex items-center justify-center"
              :class="isMuted ? 'bg-red-500/20 border-red-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'"
              :title="isMuted ? 'Activer le son' : 'Couper le son'"
              @click="toggleMute"
            >
              <span class="text-lg">{{ isMuted ? '🔇' : '🔊' }}</span>
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              @click="showEventsModal = true"
            >
              <span class="text-lg">📜</span>
              <span class="text-sm text-neutral-300">Journal</span>
            </button>
          </div>
        </div>

        <!-- Center Content: Phase + Actions -->
        <div class="flex-1 flex flex-col items-center justify-center px-4 pb-32">
          <!-- Lobby -->
          <template v-if="game.status === 'lobby'">
            <div class="w-full max-w-md animate-fade-up">
              <!-- Header -->
              <div class="text-center mb-8">
                <div class="text-6xl mb-4 animate-float">🐺</div>
                <h2 class="text-3xl font-bold text-white mb-1 tracking-wider">{{ gameCode }}</h2>
                <p class="text-neutral-500">{{ players.length }} / 5 joueurs minimum</p>
              </div>

              <!-- Players Grid -->
              <div class="mb-6">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-sm text-neutral-400 font-medium">Joueurs dans la partie</p>
                  <span class="text-xs text-violet-400 font-medium px-2 py-1 rounded-full bg-violet-500/20">
                    {{ players.length }}/{{ maxPlayers }}
                  </span>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <!-- Existing players -->
                  <div
                    v-for="player in players"
                    :key="player.id"
                    class="relative aspect-square rounded-2xl bg-gradient-to-br from-violet-600/20 to-violet-900/20 border border-violet-500/30 flex flex-col items-center justify-center p-2 transition-all"
                    :class="player.id === currentPlayer?.id ? 'ring-2 ring-violet-500' : ''"
                  >
                    <div class="text-2xl mb-1">
                      {{ player.is_host ? '👑' : '👤' }}
                    </div>
                    <p class="text-white text-xs font-medium truncate w-full text-center">
                      {{ player.name }}
                    </p>
                    <span v-if="player.id === currentPlayer?.id" class="absolute -top-1 -right-1 text-xs">✨</span>
                  </div>
                  <!-- Empty slots -->
                  <div
                    v-for="i in Math.max(0, 5 - players.length)"
                    :key="'empty-' + i"
                    class="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center"
                  >
                    <div class="w-8 h-8 rounded-full border-2 border-dashed border-white/10" />
                  </div>
                </div>
              </div>

              <!-- Test Mode Indicator -->
              <div v-if="isTestMode" class="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-yellow-400">🧪</span>
                    <span class="text-yellow-400 text-sm font-medium">Mode Test</span>
                  </div>
                  <button
                    class="px-3 py-1 text-xs rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors"
                    @click="copyTestUrl"
                  >
                    Copier URL test
                  </button>
                </div>
                <p class="text-yellow-500/70 text-xs mt-1">Chaque onglet = un joueur différent</p>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 justify-center mb-6">
                <button
                  class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  @click="shareLink"
                >
                  <span>🔗</span>
                  <span>Partager</span>
                </button>
                <button
                  v-if="isHost"
                  class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  @click="showConfigModal = true"
                >
                  <span>⚙️</span>
                  <span>Config</span>
                </button>
                <button
                  class="px-4 py-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-950/50 transition-colors flex items-center justify-center gap-2"
                  :disabled="isLeaving"
                  @click="leaveGame"
                >
                  <span>🚪</span>
                  <span>{{ isLeaving ? '...' : 'Quitter' }}</span>
                </button>
              </div>

              <!-- Start button -->
              <div v-if="isHost">
                <button
                  class="w-full px-8 py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-30"
                  :class="canStartGame
                    ? 'bg-violet-600 text-white hover:bg-violet-500 animate-pulse'
                    : 'bg-white/5 text-neutral-400 cursor-not-allowed'"
                  :disabled="!canStartGame || isStarting"
                  @click="startGame"
                >
                  {{ isStarting ? '...' : '🎮 Lancer la partie' }}
                </button>
                <p v-if="!canStartGame" class="text-center text-neutral-500 text-xs mt-2">
                  Il faut au moins 5 joueurs pour commencer
                </p>
                <div v-if="startError" class="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p class="text-red-400 text-sm text-center">{{ startError }}</p>
                </div>
              </div>

              <!-- Waiting message for non-host -->
              <div v-else class="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                <p class="text-neutral-400 text-sm">
                  ⏳ En attente du lancement par l'hôte...
                </p>
              </div>
            </div>
          </template>

          <!-- Game Phases -->
          <template v-else>
            <div class="w-full max-w-md">
              <PhasesNightPhase
                v-if="game.status === 'night'"
                :game="game"
                :current-player="currentPlayer"
                :alive-players="alivePlayers"
                :other-werewolves="otherWerewolves"
              />

              <PhasesDayPhase
                v-else-if="game.status === 'day'"
                :game="game"
                :current-player="currentPlayer"
                :alive-players="alivePlayers"
              />

              <PhasesVotePhase
                v-else-if="game.status === 'vote'"
                :game="game"
                :current-player="currentPlayer"
                :alive-players="alivePlayers"
              />

              <PhasesHunterPhase
                v-else-if="game.status === 'hunter'"
                :game="game"
                :current-player="currentPlayer"
                :alive-players="alivePlayers"
              />

              <GameOver
                v-else-if="game.status === 'finished'"
                :game="game"
                :players="players"
                :current-player="currentPlayer"
              />
            </div>
          </template>
        </div>

        <!-- Bottom Bar: Player Info (fixed) -->
        <div
          v-if="game.status !== 'lobby'"
          class="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-lg border-t border-white/5 safe-area-pb"
        >
          <button
            class="w-full p-4 flex items-center gap-4"
            @click="showRoleModal = true"
          >
            <!-- Role icon -->
            <div
              class="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
              :class="roleInfo?.team === 'werewolf' ? 'bg-red-900/50' : 'bg-violet-900/50'"
            >
              {{ roleInfo?.emoji || '❓' }}
            </div>

            <!-- Player info -->
            <div class="flex-1 text-left">
              <p class="font-semibold text-white">{{ currentPlayer.name }}</p>
              <p
                class="text-sm"
                :class="roleInfo?.team === 'werewolf' ? 'text-red-400' : 'text-violet-400'"
              >
                {{ roleInfo?.name || 'Inconnu' }}
              </p>
            </div>

            <!-- Status -->
            <div class="text-right">
              <span
                v-if="!currentPlayer.is_alive"
                class="px-3 py-1 rounded-full text-xs bg-neutral-800 text-neutral-400"
              >
                💀 Éliminé
              </span>
              <span
                v-else
                class="px-3 py-1 rounded-full text-xs"
                :class="roleInfo?.team === 'werewolf' ? 'bg-red-900/50 text-red-300' : 'bg-violet-900/50 text-violet-300'"
              >
                En vie
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Narration Overlay (fullscreen phase narration) -->
      <Transition name="fade">
        <div
          v-if="narrationPhase"
          class="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
          :class="{
            'bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950': narrationPhase === 'intro' || narrationPhase === 'night',
            'bg-gradient-to-b from-amber-950/80 via-slate-950 to-slate-950': narrationPhase === 'day',
            'bg-gradient-to-b from-orange-950/80 via-slate-950 to-slate-950': narrationPhase === 'vote'
          }"
        >
          <div class="text-center max-w-md animate-fade-up">
            <!-- Phase icon -->
            <div class="relative mb-8">
              <div class="text-8xl animate-float filter drop-shadow-2xl">
                {{ narrationPhase === 'intro' || narrationPhase === 'night' ? '🌙' : narrationPhase === 'day' ? '☀️' : '⚖️' }}
              </div>
              <div
                class="absolute -inset-8 blur-3xl rounded-full -z-10 animate-pulse"
                :class="{
                  'bg-indigo-500/20': narrationPhase === 'intro' || narrationPhase === 'night',
                  'bg-amber-500/20': narrationPhase === 'day',
                  'bg-orange-500/20': narrationPhase === 'vote'
                }"
              />
            </div>

            <!-- Title -->
            <h2 class="text-2xl font-bold text-white mb-6">
              {{ narrationPhase === 'intro' ? 'La nuit tombe...' :
                 narrationPhase === 'night' ? 'La nuit s\'éveille...' :
                 narrationPhase === 'day' ? 'Le jour se lève...' :
                 'L\'heure du vote...' }}
            </h2>

            <!-- Narration text -->
            <div class="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
              <p class="text-neutral-300 leading-relaxed italic">
                "{{ narrationText }}"
              </p>
            </div>

            <!-- Speaking indicator -->
            <div
              class="flex items-center justify-center gap-3"
              :class="{
                'text-indigo-400': narrationPhase === 'intro' || narrationPhase === 'night',
                'text-amber-400': narrationPhase === 'day',
                'text-orange-400': narrationPhase === 'vote'
              }"
            >
              <div class="flex gap-1">
                <span
                  class="w-2 h-2 rounded-full animate-bounce"
                  :class="{
                    'bg-indigo-400': narrationPhase === 'intro' || narrationPhase === 'night',
                    'bg-amber-400': narrationPhase === 'day',
                    'bg-orange-400': narrationPhase === 'vote'
                  }"
                  style="animation-delay: 0s"
                />
                <span
                  class="w-2 h-2 rounded-full animate-bounce"
                  :class="{
                    'bg-indigo-400': narrationPhase === 'intro' || narrationPhase === 'night',
                    'bg-amber-400': narrationPhase === 'day',
                    'bg-orange-400': narrationPhase === 'vote'
                  }"
                  style="animation-delay: 0.1s"
                />
                <span
                  class="w-2 h-2 rounded-full animate-bounce"
                  :class="{
                    'bg-indigo-400': narrationPhase === 'intro' || narrationPhase === 'night',
                    'bg-amber-400': narrationPhase === 'day',
                    'bg-orange-400': narrationPhase === 'vote'
                  }"
                  style="animation-delay: 0.2s"
                />
              </div>
              <span class="text-sm">Le narrateur parle...</span>
            </div>

            <!-- Skip button (host only) -->
            <button
              v-if="isHost"
              class="mt-6 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
              @click="skipNarration"
            >
              Passer →
            </button>
          </div>
        </div>
      </Transition>
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
          <p
            class="text-sm mb-4"
            :class="roleInfo.team === 'werewolf' ? 'text-red-400' : 'text-violet-400'"
          >
            {{ roleInfo.team === 'werewolf' ? 'Équipe Loups-Garous' : 'Équipe Village' }}
          </p>
          <p class="text-neutral-400 text-sm mb-6">{{ roleInfo.description }}</p>

          <div
            v-if="currentPlayer?.role === 'werewolf' && otherWerewolves.length > 0"
            class="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-800/30"
          >
            <p class="text-xs text-red-400 mb-2">🐺 Ta meute</p>
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
            Compris
          </button>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showPlayersModal">
      <template #content>
        <div class="p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-white">Joueurs ({{ alivePlayers.length }}/{{ players.length }})</h3>
            <button class="text-neutral-500 hover:text-white text-xl" @click="showPlayersModal = false">×</button>
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
            <h3 class="font-semibold text-white">Journal</h3>
            <button class="text-neutral-500 hover:text-white text-xl" @click="showEventsModal = false">×</button>
          </div>
          <GameEventLog :events="events" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showConfigModal">
      <template #content>
        <div class="p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-white">Configuration</h3>
            <button class="text-neutral-500 hover:text-white text-xl" @click="showConfigModal = false">×</button>
          </div>
          <GameConfig
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
.safe-area-pb {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake 0.4s ease-in-out;
}
</style>
