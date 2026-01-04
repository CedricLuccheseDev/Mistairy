<script setup lang="ts">
import * as gameApi from '~/services/gameApi'

/* --- States --- */
const gameCode = ref('')
const isCreating = ref(false)
const showJoinInput = ref(false)
const error = ref('')

/* --- Methods --- */
async function createGame() {
  isCreating.value = true
  error.value = ''

  try {
    const response = await gameApi.createGame()

    // Store created game info for cleanup if creator leaves without joining
    sessionStorage.setItem('createdGame', JSON.stringify({
      gameId: response.gameId,
      code: response.code
    }))

    await navigateTo(`/game/${response.code}`)
  }
  catch (e) {
    error.value = 'Erreur lors de la création'
    console.error(e)
    isCreating.value = false
  }
}

function goToGame() {
  if (!gameCode.value.trim() || gameCode.value.length !== 6) {
    error.value = 'Code invalide (6 caractères)'
    return
  }
  navigateTo(`/game/${gameCode.value.toUpperCase()}`)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-violet-950/30 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">
    <!-- Enhanced Background Particles -->
    <GamePhaseParticles phase="lobby" intensity="medium" />

    <!-- Additional decorative elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Floating orbs -->
      <div class="absolute -top-20 -left-20 w-64 h-64 bg-violet-600/15 rounded-full blur-3xl animate-float" style="animation-duration: 8s" />
      <div class="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl animate-float" style="animation-duration: 10s; animation-delay: 2s" />
      <div class="absolute top-1/3 right-1/5 w-48 h-48 bg-red-600/10 rounded-full blur-3xl animate-float" style="animation-duration: 12s; animation-delay: 4s" />

      <!-- Subtle grid pattern -->
      <div class="absolute inset-0 opacity-[0.02]" style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 50px 50px" />
    </div>

    <!-- Content -->
    <div class="relative z-10 w-full max-w-md">
      <!-- Logo & Title -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
        class="text-center mb-12"
      >
        <div class="relative inline-block">
          <div class="text-9xl animate-float filter drop-shadow-2xl">
            🐺
          </div>
          <div class="absolute -inset-4 bg-violet-500/20 blur-2xl rounded-full -z-10" />
        </div>
        <h1 class="text-5xl font-black text-white mt-4 tracking-tight">
          Mistairy
        </h1>
        <p class="text-neutral-400 mt-2">
          Jouez au jeu du Loup Garou sans cartes physiques et sans narrateur
        </p>
      </div>

      <!-- Cards -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 500, delay: 150 } }"
        class="grid gap-4"
      >
        <!-- Create Game Card -->
        <button
          class="group relative p-6 rounded-3xl bg-gradient-to-br from-violet-600/20 to-violet-900/20 border border-violet-500/30 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 disabled:opacity-50 disabled:hover:scale-100"
          :disabled="isCreating"
          @click="createGame"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div class="relative flex items-center gap-5">
            <div class="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
              ✨
            </div>
            <div class="flex-1 text-left">
              <h2 class="text-xl font-bold text-white group-hover:text-violet-200 transition-colors">
                {{ isCreating ? 'Création...' : 'Créer une partie' }}
              </h2>
              <p class="text-neutral-400 text-sm">
                Deviens le maître du jeu
              </p>
            </div>
            <div class="text-2xl text-violet-400 group-hover:translate-x-1 transition-transform">
              →
            </div>
          </div>
        </button>

        <!-- Join Game Card -->
        <div
          class="group relative rounded-3xl bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/30 backdrop-blur-sm overflow-hidden transition-all duration-300"
          :class="showJoinInput ? 'p-4' : 'hover:scale-[1.02] hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10'"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <!-- Collapsed state -->
          <button
            v-if="!showJoinInput"
            class="relative w-full p-6 flex items-center gap-5"
            @click="showJoinInput = true"
          >
            <div class="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
              🔗
            </div>
            <div class="flex-1 text-left">
              <h2 class="text-xl font-bold text-white group-hover:text-indigo-200 transition-colors">
                Rejoindre une partie
              </h2>
              <p class="text-neutral-400 text-sm">
                Entre le code de ton ami
              </p>
            </div>
            <div class="text-2xl text-indigo-400 group-hover:translate-x-1 transition-transform">
              →
            </div>
          </button>

          <!-- Expanded state -->
          <div v-else class="relative space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl shrink-0">
                🔗
              </div>
              <input
                v-model="gameCode"
                type="text"
                placeholder="CODE"
                maxlength="6"
                autofocus
                class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center tracking-[0.3em] font-mono text-lg uppercase placeholder-neutral-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                @keyup.enter="goToGame"
              >
            </div>
            <div class="flex gap-2">
              <button
                class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-neutral-400 font-medium hover:bg-white/10 transition-colors"
                @click="showJoinInput = false; gameCode = ''; error = ''"
              >
                Retour
              </button>
              <button
                class="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
                @click="goToGame"
              >
                Rejoindre
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <Transition name="fade">
        <div v-if="error" class="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center animate-shake">
          <p class="text-red-400 text-sm">{{ error }}</p>
        </div>
      </Transition>

      <!-- Footer -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 500, delay: 300 } }"
        class="mt-12"
      >
        <!-- Player count badge -->
        <div class="flex items-center justify-center gap-2 mb-4">
          <div class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <span class="text-sm">👥</span>
            <span class="text-sm text-neutral-400">5 - 18 joueurs</span>
          </div>
        </div>

        <!-- Divider -->
        <div class="flex items-center gap-4 my-4">
          <div class="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span class="text-neutral-700 text-xs">MISTAIRY</span>
          <div class="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <!-- Links -->
        <div class="flex items-center justify-center gap-4 text-xs">
          <NuxtLink
            to="/admin"
            class="text-neutral-600 hover:text-violet-400 transition-colors"
          >
            Administration
          </NuxtLink>
          <span class="text-neutral-800">|</span>
          <a
            href="https://github.com"
            target="_blank"
            class="text-neutral-600 hover:text-violet-400 transition-colors"
          >
            GitHub
          </a>
        </div>

        <!-- Version -->
        <p class="text-neutral-800 text-[10px] mt-3 text-center">
          v1.0.0
        </p>
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
