<script setup lang="ts">
import type { Database } from '#shared/types/database.types'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: Player
  alivePlayers: Player[]
}>()

/* --- Services --- */
const supabase = useSupabaseClient<Database>()
const toast = useToast()

/* --- States --- */
const isReady = ref(false)
const isSubmitting = ref(false)
const readyPlayerIds = ref<string[]>([])

/* --- Computed --- */
const readyCount = computed(() => readyPlayerIds.value.length)
const totalAlive = computed(() => props.alivePlayers.length)
const allReady = computed(() => readyCount.value >= totalAlive.value)
const progressPercent = computed(() => Math.round((readyCount.value / totalAlive.value) * 100))

/* --- Methods --- */
async function markReady() {
  if (isReady.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    await $fetch('/api/game/ready', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id
      }
    })

    isReady.value = true
    toast.add({ title: '✅ Prêt à voter', color: 'success' })
  }
  catch (e) {
    console.error('Ready failed:', e)
    toast.add({ title: 'Erreur', color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}

function isPlayerReady(playerId: string): boolean {
  return readyPlayerIds.value.includes(playerId)
}

/* --- Fetch ready players --- */
async function fetchReadyPlayers() {
  const { data } = await supabase
    .from('day_ready')
    .select('player_id')
    .eq('game_id', props.game.id)
    .eq('day_number', props.game.day_number)

  if (data) {
    readyPlayerIds.value = data.map(r => r.player_id)
    isReady.value = readyPlayerIds.value.includes(props.currentPlayer.id)
  }
}

/* --- Realtime subscription --- */
let channel: ReturnType<typeof supabase.channel> | null = null

onMounted(async () => {
  await fetchReadyPlayers()

  channel = supabase
    .channel(`day_ready:${props.game.id}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'day_ready',
      filter: `game_id=eq.${props.game.id}`
    }, (payload) => {
      const newReady = payload.new as { player_id: string; day_number: number }
      if (newReady.day_number === props.game.day_number && !readyPlayerIds.value.includes(newReady.player_id)) {
        readyPlayerIds.value.push(newReady.player_id)
      }
    })
    .subscribe()
})

onUnmounted(() => {
  if (channel) {
    supabase.removeChannel(channel)
  }
})

/* --- Watch for day change --- */
watch(() => props.game.day_number, () => {
  readyPlayerIds.value = []
  isReady.value = false
  fetchReadyPlayers()
})
</script>

<template>
  <div class="flex-1 flex flex-col relative min-h-0 overflow-visible">
    <!-- Background particles -->
    <GamePhaseParticles phase="day" intensity="medium" />

    <!-- Radial glow -->
    <div class="absolute inset-0 bg-gradient-radial from-amber-500/15 via-transparent to-transparent pointer-events-none" />

    <!-- Icon glow (radial gradient, no blur needed) -->
    <Teleport to="body">
      <div
        class="fixed inset-0 pointer-events-none -z-10"
        style="background: radial-gradient(ellipse 80% 60% at 50% 33%, rgba(245, 158, 11, 0.5) 0%, transparent 70%);"
      />
    </Teleport>

    <!-- Main Content -->
    <div class="relative z-10 flex-1 flex flex-col justify-center overflow-visible">
      <!-- Header -->
      <div class="text-center pb-4 px-4 animate-fade-up">
        <!-- Sun Icon -->
        <div class="relative inline-block mb-4">
          <div class="text-7xl sm:text-8xl animate-float">☀️</div>
        </div>

        <!-- Title -->
        <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-amber-400 mb-2">
          Jour {{ game.day_number }}
        </h1>

        <!-- Subtitle -->
        <p class="text-lg sm:text-xl text-white/60">
          {{ currentPlayer.is_alive ? 'Débattez et trouvez les loups' : 'Tu observes depuis l\'au-delà...' }}
        </p>
      </div>

      <!-- Content -->
      <div class="px-4 pb-6">
        <!-- Dead player view -->
        <div v-if="!currentPlayer.is_alive" class="flex-1 flex flex-col items-center justify-center py-12 animate-fade-up">
          <div class="text-center">
            <div class="text-6xl mb-6 opacity-50">💀</div>
            <p class="text-2xl font-bold text-white/70 mb-2">Éliminé</p>
            <p class="text-lg text-white/40">Tu observes en silence...</p>
          </div>
        </div>

        <!-- Discussion phase -->
        <template v-else>
          <!-- Progress Section -->
          <div class="mb-6 animate-fade-up">
            <!-- Progress Ring Visual -->
            <div class="flex justify-center mb-6">
              <div class="relative w-32 h-32">
                <!-- Background circle -->
                <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="8"
                    class="text-white/10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="8"
                    stroke-linecap="round"
                    :stroke-dasharray="264"
                    :stroke-dashoffset="264 - (264 * progressPercent) / 100"
                    class="transition-all duration-500"
                    :class="allReady ? 'text-green-500' : 'text-amber-500'"
                  />
                </svg>
                <!-- Center text -->
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-3xl font-black" :class="allReady ? 'text-green-400' : 'text-amber-400'">
                    {{ readyCount }}
                  </span>
                  <span class="text-xs text-white/40">sur {{ totalAlive }}</span>
                </div>
              </div>
            </div>

            <p class="text-center text-white/60 text-sm">
              {{ allReady ? 'Tout le monde est prêt !' : 'Joueurs prêts à voter' }}
            </p>
          </div>

          <!-- Players grid with ready status -->
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            <div
              v-for="(player, index) in alivePlayers"
              :key="player.id"
              :style="{ animationDelay: `${index * 50}ms` }"
              class="animate-slide-up-stagger"
            >
              <div
                class="relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-300"
                :class="[
                  player.id === currentPlayer.id
                    ? 'bg-amber-950/40 border-amber-500/50'
                    : 'bg-white/5 border-white/10',
                  isPlayerReady(player.id) && 'ring-2 ring-green-500/50'
                ]"
              >
                <!-- Ready indicator -->
                <Transition name="pop">
                  <div
                    v-if="isPlayerReady(player.id)"
                    class="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-check-pop shadow-lg shadow-green-500/30"
                  >
                    <span class="text-xs text-white">✓</span>
                  </div>
                </Transition>

                <!-- Avatar -->
                <div
                  class="w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300"
                  :class="isPlayerReady(player.id) ? 'bg-green-500/20' : 'bg-white/10'"
                >
                  <span class="text-2xl">{{ isPlayerReady(player.id) ? '✅' : '👤' }}</span>
                </div>

                <!-- Name -->
                <p
                  class="text-xs font-medium truncate w-full text-center transition-colors duration-300"
                  :class="[
                    player.id === currentPlayer.id ? 'text-amber-300' : 'text-white/70',
                    isPlayerReady(player.id) && 'text-green-400'
                  ]"
                >
                  {{ player.name }}
                </p>
              </div>
            </div>
          </div>

          <!-- Ready button -->
          <div class="animate-fade-up" style="animation-delay: 0.3s">
            <button
              v-if="!isReady"
              class="w-full py-5 rounded-2xl font-black text-xl transition-all duration-300 relative overflow-hidden"
              :class="isSubmitting
                ? 'bg-neutral-700 text-neutral-400 cursor-wait'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/20'"
              :disabled="isSubmitting"
              @click="markReady"
            >
              <!-- Shimmer effect -->
              <div v-if="!isSubmitting" class="absolute inset-0 animate-shimmer" />

              <span class="relative z-10">
                {{ isSubmitting ? '...' : '✓ PRÊT À VOTER' }}
              </span>
            </button>

            <!-- Already ready -->
            <div v-else class="text-center py-6 rounded-2xl bg-green-900/20 border-2 border-green-500/30">
              <div class="text-4xl mb-3 animate-check-pop">✅</div>
              <p class="text-green-400 font-bold text-lg">Tu es prêt</p>
              <p class="text-white/40 text-sm mt-1">Attends les autres joueurs...</p>
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

.pop-enter-active {
  animation: pop-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes pop-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
