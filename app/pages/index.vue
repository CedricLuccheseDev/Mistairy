<script setup lang="ts">
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
    const response = await $fetch('/api/game/create', {
      method: 'POST'
    })

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
    <!-- Background decorations -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -left-40 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s" />
      <div class="absolute top-1/4 right-1/4 w-64 h-64 bg-red-600/5 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s" />
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
          Loup Agrou
        </h1>
        <p class="text-neutral-400 mt-2">
          Jouez sans cartes physiques
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
        class="mt-10 text-center"
      >
        <p class="text-neutral-600 text-sm">
          5 à 18 joueurs
        </p>
        <NuxtLink
          to="/admin"
          class="inline-block mt-3 text-xs text-neutral-700 hover:text-violet-400 transition-colors"
        >
          Administration
        </NuxtLink>
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
