<script setup lang="ts">
import type { Game, Player } from '#shared/types/game'
import * as gameApi from '~/services/gameApi'

/* --- Props --- */
const props = defineProps<{
  game: Game
  players: Player[]
  currentPlayer: Player
  isHost: boolean
  canStartGame: boolean
  isTestMode: boolean
}>()

/* --- Emits --- */
const emit = defineEmits<{
  start: []
  leave: []
  showConfig: []
}>()

/* --- State --- */
const isStarting = ref(false)
const startError = ref<string | null>(null)

/* --- Computed --- */
const maxPlayers = computed(() => {
  const settings = props.game.settings as { max_players?: number }
  return settings?.max_players || 18
})

/* --- Methods --- */
async function startGame() {
  if (!props.canStartGame) return

  isStarting.value = true
  startError.value = null

  try {
    await gameApi.startGame(props.game.id, props.currentPlayer.id)
    emit('start')
  }
  catch (e: unknown) {
    const fetchError = e as { data?: { message?: string }, message?: string }
    startError.value = fetchError.data?.message || fetchError.message || 'Erreur lors du lancement'
    console.error('Failed to start game:', e)
  }
  finally {
    isStarting.value = false
  }
}

function shareLink() {
  const baseUrl = `${window.location.origin}/game/${props.game.code}`
  if (navigator.share) {
    navigator.share({ title: `Mistairy - ${props.game.code}`, url: baseUrl })
  }
  else {
    navigator.clipboard.writeText(baseUrl)
  }
}

function copyTestUrl() {
  const testUrl = `${window.location.origin}/game/${props.game.code}?test`
  navigator.clipboard.writeText(testUrl)
}
</script>

<template>
  <div class="w-full max-w-md animate-fade-up">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="text-6xl mb-4 animate-float">🐺</div>
      <h2 class="text-3xl font-bold text-white mb-1 tracking-wider">{{ game.code }}</h2>
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
          :class="player.id === currentPlayer.id ? 'ring-2 ring-violet-500' : ''"
        >
          <div class="text-2xl mb-1">
            {{ player.is_host ? '👑' : '👤' }}
          </div>
          <p class="text-white text-xs font-medium truncate w-full text-center">
            {{ player.name }}
          </p>
          <span v-if="player.id === currentPlayer.id" class="absolute -top-1 -right-1 text-xs">✨</span>
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
        @click="emit('showConfig')"
      >
        <span>⚙️</span>
        <span>Config</span>
      </button>
      <button
        class="px-4 py-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-950/50 transition-colors flex items-center justify-center gap-2"
        @click="emit('leave')"
      >
        <span>🚪</span>
        <span>Quitter</span>
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
