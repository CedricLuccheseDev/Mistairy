<script setup lang="ts">
import type { Game, Player } from '#shared/types/game'
import * as gameApi from '~/services/gameApi'

/* --- Composables --- */
const { t } = useI18n()

/* --- Props --- */
const props = defineProps<{
  game: Game
  players: Player[]
  gameCode: string
}>()

/* --- Emits --- */
const emit = defineEmits<{
  joined: [playerId: string]
}>()

/* --- State --- */
const supabase = useSupabaseClient()
const { setPlayerId } = usePlayerStorage()

const joinName = ref('')
const isJoining = ref(false)
const isGoogleLoading = ref(false)
const joinError = ref('')

/* --- Methods --- */
async function joinGame() {
  if (!joinName.value.trim()) {
    joinError.value = t.value.enterFirstName
    return
  }

  isJoining.value = true
  joinError.value = ''

  try {
    const response = await gameApi.joinGame(props.gameCode, joinName.value.trim())
    if (response.playerId) {
      setPlayerId(response.playerId)
      sessionStorage.removeItem('createdGame')
      emit('joined', response.playerId)
    }
  }
  catch (e: unknown) {
    const fetchError = e as { data?: { message?: string } }
    joinError.value = fetchError.data?.message || t.value.connectionError
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
        redirectTo: `${window.location.origin}/game/${props.gameCode}?auth=google`
      }
    })

    if (authError) {
      joinError.value = t.value.googleAuthError
      console.error('Google auth error:', authError)
    }
  }
  catch (e) {
    joinError.value = t.value.googleAuthError
    console.error('Google auth error:', e)
  }
  finally {
    isGoogleLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-violet-950/30 via-slate-950 to-slate-950 flex flex-col overflow-hidden">
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
        <span class="text-sm">{{ t.back }}</span>
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
            <span class="text-neutral-400 text-sm">{{ players.length }} {{ t.playersWaiting }}</span>
          </div>
        </div>

        <!-- Join Options (only in lobby) -->
        <div v-if="game.status === 'lobby'" class="space-y-4 animate-fade-up" style="animation-delay: 0.15s">
          <!-- Name Input Card -->
          <div class="p-5 rounded-3xl bg-gradient-to-br from-violet-600/20 to-violet-900/20 border border-violet-500/30 backdrop-blur-sm">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl">
                ✏️
              </div>
              <p class="text-white font-medium">{{ t.enterFirstName }}</p>
            </div>
            <input
              v-model="joinName"
              type="text"
              :placeholder="t.firstName"
              autofocus
              class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg placeholder-neutral-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
              @keyup.enter="joinGame"
            >
            <button
              class="w-full mt-3 px-6 py-3.5 rounded-xl bg-violet-600 text-white font-bold text-lg hover:bg-violet-500 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              :disabled="isJoining || !joinName.trim()"
              @click="joinGame"
            >
              {{ isJoining ? t.joining : t.joinTheGame }}
            </button>
          </div>

          <!-- Divider -->
          <div class="flex items-center gap-4">
            <div class="flex-1 h-px bg-white/10" />
            <span class="text-neutral-500 text-sm">{{ t.or }}</span>
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
                  {{ isGoogleLoading ? t.joining : t.continueWithGoogle }}
                </p>
                <p class="text-neutral-500 text-sm">{{ t.quickGoogleLogin }}</p>
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
            <p class="text-orange-400 font-semibold mb-2">{{ t.gameInProgress }}</p>
            <p class="text-neutral-400 text-sm mb-4">{{ t.cannotJoinGame }}</p>
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              ← {{ t.backToHome }}
            </NuxtLink>
          </div>
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
