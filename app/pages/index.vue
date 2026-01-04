<script setup lang="ts">
import * as gameApi from '~/services/gameApi'

/* --- Meta --- */
definePageMeta({
  layoutConfig: {
    hideLogo: true
  }
})

/* --- Composables --- */
const { t } = useI18n()

/* --- States --- */
const gameCode = ref('')
const isCreating = ref(false)
const isJoining = ref(false)
const error = ref('')
const shakeInput = ref(false)

/* --- Methods --- */
async function createGame() {
  isCreating.value = true
  error.value = ''

  try {
    const response = await gameApi.createGame()

    sessionStorage.setItem('createdGame', JSON.stringify({
      gameId: response.gameId,
      code: response.code
    }))

    await navigateTo(`/game/${response.code}`)
  }
  catch (e) {
    error.value = t.value.createError
    console.error(e)
    isCreating.value = false
  }
}

async function goToGame() {
  if (!gameCode.value.trim() || gameCode.value.length !== 6) {
    error.value = t.value.invalidCode
    triggerShake()
    return
  }

  isJoining.value = true
  error.value = ''

  try {
    const result = await gameApi.checkGameExists(gameCode.value)

    if (!result.exists) {
      error.value = t.value.gameNotFound
      triggerShake()
      return
    }

    await navigateTo(`/game/${gameCode.value.toUpperCase()}`)
  }
  catch {
    error.value = t.value.connectionError
    triggerShake()
  }
  finally {
    isJoining.value = false
  }
}

function triggerShake() {
  shakeInput.value = true
  setTimeout(() => {
    shakeInput.value = false
  }, 400)
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Background -->
    <GamePhaseParticles phase="lobby" intensity="medium" />
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-20 -left-20 w-64 h-64 bg-violet-600/15 rounded-full blur-3xl animate-float" style="animation-duration: 8s" />
      <div class="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl animate-float" style="animation-duration: 10s; animation-delay: 2s" />
      <div class="absolute top-1/3 right-1/5 w-48 h-48 bg-red-600/10 rounded-full blur-3xl animate-float" style="animation-duration: 12s; animation-delay: 4s" />
      <div class="absolute inset-0 opacity-[0.02]" style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 50px 50px" />
    </div>

    <!-- Content -->
    <div class="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
      <!-- Logo & Title -->
      <div
        v-motion
        :initial="{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }"
        :enter="{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 120, damping: 15, delay: 100 } }"
        class="mb-3 md:mb-4"
      >
        <div class="relative inline-block">
          <div class="text-8xl md:text-9xl animate-float filter drop-shadow-2xl">
            🐺
          </div>
          <div class="absolute -inset-4 bg-violet-500/20 blur-2xl rounded-full -z-10" />
        </div>
      </div>

      <h1
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 400, delay: 200 } }"
        class="text-4xl md:text-5xl font-black text-white tracking-tight"
      >
        Mistairy
      </h1>

      <p
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 400, delay: 300 } }"
        class="text-neutral-400 mt-2 mb-8 text-center text-sm md:text-base"
      >
        {{ t.tagline }}
      </p>

      <!-- Cards -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 30 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 400, delay: 400 } }"
        class="w-full max-w-md grid gap-4"
      >
        <!-- Create Game Card -->
        <button
          class="group relative p-5 rounded-2xl bg-gradient-to-br from-violet-600/20 to-violet-900/20 border border-violet-500/30 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 disabled:opacity-50 disabled:hover:scale-100"
          :disabled="isCreating"
          @click="createGame"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div class="relative flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              ✨
            </div>
            <div class="flex-1 text-left">
              <h2 class="text-lg font-bold text-white group-hover:text-violet-200 transition-colors">
                {{ isCreating ? t.creating : t.createGame }}
              </h2>
              <p class="text-neutral-400 text-sm">
                {{ t.createGameSub }}
              </p>
            </div>
            <div class="text-xl text-violet-400 group-hover:translate-x-1 transition-transform">
              →
            </div>
          </div>
        </button>

        <!-- Join Game Card (always expanded) -->
        <div class="relative p-4 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/30 backdrop-blur-sm">
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl shrink-0">
                🔗
              </div>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">
                  {{ t.joinGame }}
                </h2>
                <p class="text-neutral-400 text-xs">
                  {{ t.joinGameSub }}
                </p>
              </div>
            </div>
            <input
              v-model="gameCode"
              type="text"
              :placeholder="t.codePlaceholder"
              maxlength="6"
              :disabled="isJoining"
              :class="[
                'w-full px-4 py-3 rounded-xl bg-white/5 border text-white text-center tracking-[0.3em] font-mono text-lg uppercase placeholder-neutral-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50',
                shakeInput ? 'animate-shake border-red-500/50' : 'border-white/10'
              ]"
              @keyup.enter="goToGame"
            >
            <button
              class="w-full px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600"
              :disabled="isJoining"
              @click="goToGame"
            >
              {{ isJoining ? t.joining : t.join }}
            </button>
          </div>
        </div>
      </div>

      <!-- Error -->
      <Transition name="fade">
        <div v-if="error" class="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center animate-shake">
          <p class="text-red-400 text-sm">{{ error }}</p>
        </div>
      </Transition>

      <!-- Player count badge -->
      <div
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { duration: 400, delay: 500 } }"
        class="mt-8"
      >
        <div class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
          <span class="text-sm">👥</span>
          <span class="text-sm text-neutral-400">{{ t.playerCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
