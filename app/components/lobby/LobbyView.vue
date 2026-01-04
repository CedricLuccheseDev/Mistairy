<script setup lang="ts">
import type { Game, Player } from '#shared/types/game'
import * as gameApi from '~/services/gameApi'

/* --- Composables --- */
const { t } = useI18n()

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
const copied = ref(false)

/* --- Computed --- */
const maxPlayers = computed(() => {
  const settings = props.game.settings as { max_players?: number }
  return settings?.max_players || 18
})

const gameUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/game/${props.game.code}`
})

const qrCodeUrl = computed(() => {
  if (!gameUrl.value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(gameUrl.value)}&bgcolor=0a0a0a&color=a78bfa`
})

const playersNeeded = computed(() => Math.max(0, 5 - props.players.length))

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

function copyCode() {
  navigator.clipboard.writeText(props.game.code)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function shareLink() {
  if (navigator.share) {
    navigator.share({ title: `Mistairy - ${props.game.code}`, url: gameUrl.value })
  }
  else {
    navigator.clipboard.writeText(gameUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

function copyTestUrl() {
  const testUrl = `${window.location.origin}/game/${props.game.code}?test`
  navigator.clipboard.writeText(testUrl)
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Main Content -->
    <div class="flex flex-1 flex-col lg:flex-row">
      <!-- Left Panel: Game Info -->
      <div class="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <!-- Game Code Section -->
        <div
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
          class="text-center mb-8"
        >
          <div class="text-7xl md:text-8xl mb-6 animate-float filter drop-shadow-2xl">
            🐺
          </div>
          <p class="text-neutral-500 text-sm mb-2 uppercase tracking-widest">{{ t.gameCode }}</p>
          <button
            class="group relative"
            @click="copyCode"
          >
            <h1 class="text-5xl md:text-7xl font-black text-white tracking-[0.2em] group-hover:text-violet-300 transition-colors">
              {{ game.code }}
            </h1>
            <div class="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span v-if="copied" class="text-green-400 text-sm">✓</span>
              <span v-else class="text-neutral-500 text-sm">📋</span>
            </div>
          </button>
        </div>

        <!-- QR Code Card -->
        <div
          v-motion
          :initial="{ opacity: 0, scale: 0.9 }"
          :enter="{ opacity: 1, scale: 1, transition: { duration: 400, delay: 100 } }"
          class="relative mb-8"
        >
          <div class="p-4 rounded-3xl bg-gradient-to-br from-violet-600/10 to-indigo-600/10 border border-violet-500/20 backdrop-blur-sm">
            <img
              v-if="qrCodeUrl"
              :src="qrCodeUrl"
              alt="QR Code"
              class="w-40 h-40 md:w-48 md:h-48 rounded-2xl"
            >
            <p class="text-neutral-400 text-xs text-center mt-3">{{ t.scanToJoin }}</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 400, delay: 200 } }"
          class="flex flex-wrap gap-3 justify-center"
        >
          <button
            class="px-5 py-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-all flex items-center gap-2"
            @click="shareLink"
          >
            <UIcon name="i-heroicons-share" class="w-4 h-4" />
            <span>{{ t.share }}</span>
          </button>
          <button
            v-if="isHost"
            class="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 transition-all flex items-center gap-2"
            @click="emit('showConfig')"
          >
            <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
            <span>{{ t.config }}</span>
          </button>
        </div>

        <!-- Test Mode -->
        <div
          v-if="isTestMode"
          v-motion
          :initial="{ opacity: 0 }"
          :enter="{ opacity: 1, transition: { duration: 400, delay: 300 } }"
          class="mt-6 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3"
        >
          <span class="text-yellow-400">🧪</span>
          <span class="text-yellow-300 text-sm">{{ t.testMode }}</span>
          <button
            class="px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30 transition-colors"
            @click="copyTestUrl"
          >
            {{ t.copyTestUrl }}
          </button>
        </div>
      </div>

      <!-- Right Panel: Players -->
      <div class="flex-1 flex flex-col p-6 lg:p-12 lg:border-l border-white/5">
        <!-- Players Header -->
        <div
          v-motion
          :initial="{ opacity: 0, x: 20 }"
          :enter="{ opacity: 1, x: 0, transition: { duration: 400 } }"
          class="flex items-center justify-between mb-6"
        >
          <div>
            <h2 class="text-xl font-bold text-white">{{ t.players }}</h2>
            <p class="text-neutral-500 text-sm">
              <span v-if="playersNeeded > 0">{{ playersNeeded }} {{ t.playersNeeded }}</span>
              <span v-else class="text-green-400">{{ t.readyToPlay }}</span>
            </p>
          </div>
          <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600/20 border border-violet-500/30">
            <span class="text-violet-300 font-bold">{{ players.length }}</span>
            <span class="text-neutral-500">/</span>
            <span class="text-neutral-400">{{ maxPlayers }}</span>
          </div>
        </div>

        <!-- Players Grid -->
        <div
          v-motion
          :initial="{ opacity: 0 }"
          :enter="{ opacity: 1, transition: { duration: 400, delay: 100 } }"
          class="flex-1 overflow-y-auto"
        >
          <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <!-- Existing players -->
            <div
              v-for="(player, index) in players"
              :key="player.id"
              v-motion
              :initial="{ opacity: 0, scale: 0.8 }"
              :enter="{ opacity: 1, scale: 1, transition: { duration: 300, delay: index * 50 } }"
              class="relative aspect-square rounded-2xl p-3 flex flex-col items-center justify-center transition-all"
              :class="[
                player.id === currentPlayer.id
                  ? 'bg-gradient-to-br from-violet-600/30 to-violet-900/30 border-2 border-violet-500 shadow-lg shadow-violet-500/20'
                  : 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-white/20'
              ]"
            >
              <!-- Host Crown -->
              <div v-if="player.is_host" class="absolute -top-2 left-1/2 -translate-x-1/2">
                <span class="text-lg">👑</span>
              </div>

              <!-- Avatar -->
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2"
                :class="player.id === currentPlayer.id ? 'bg-violet-600/30' : 'bg-white/10'"
              >
                {{ player.is_host ? '🐺' : '👤' }}
              </div>

              <!-- Name -->
              <p class="text-white text-sm font-medium truncate w-full text-center">
                {{ player.name }}
              </p>

              <!-- You indicator -->
              <span
                v-if="player.id === currentPlayer.id"
                class="absolute bottom-1 right-1 text-[10px] text-violet-300 bg-violet-600/30 px-1.5 py-0.5 rounded"
              >
                {{ t.you }}
              </span>
            </div>

            <!-- Empty slots (show only needed) -->
            <div
              v-for="i in playersNeeded"
              :key="'empty-' + i"
              class="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2"
            >
              <div class="w-10 h-10 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                <UIcon name="i-heroicons-user-plus" class="w-5 h-5 text-white/20" />
              </div>
              <span class="text-white/20 text-xs">{{ t.waiting }}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Actions -->
        <div
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 400, delay: 200 } }"
          class="mt-6 space-y-3"
        >
          <!-- Start Button (Host only) -->
          <div v-if="isHost">
            <button
              class="w-full px-6 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3"
              :class="canStartGame
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25'
                : 'bg-white/5 text-neutral-500 cursor-not-allowed'"
              :disabled="!canStartGame || isStarting"
              @click="startGame"
            >
              <UIcon v-if="!isStarting" name="i-heroicons-play" class="w-6 h-6" />
              <UIcon v-else name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin" />
              <span>{{ isStarting ? t.starting : t.startGame }}</span>
            </button>
            <div v-if="startError" class="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <p class="text-red-400 text-sm text-center">{{ startError }}</p>
            </div>
          </div>

          <!-- Waiting message (non-host) -->
          <div v-else class="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <div class="flex items-center justify-center gap-2 text-neutral-400">
              <div class="flex gap-1">
                <span class="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style="animation-delay: 0ms" />
                <span class="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style="animation-delay: 150ms" />
                <span class="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style="animation-delay: 300ms" />
              </div>
              <span>{{ t.waitingForHost }}</span>
            </div>
          </div>

          <!-- Leave Button -->
          <button
            class="w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
            @click="emit('leave')"
          >
            <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5" />
            <span>{{ t.leaveGame }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
