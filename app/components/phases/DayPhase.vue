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
  <div class="rounded-2xl border border-amber-500/30 bg-amber-950/30 backdrop-blur-sm overflow-hidden">
    <!-- Header -->
    <div class="p-4 border-b border-white/10">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-amber-900/50 flex items-center justify-center text-2xl animate-float">
          ☀️
        </div>
        <div class="flex-1">
          <p class="font-bold text-amber-400">Jour {{ game.day_number }}</p>
          <p class="text-neutral-500 text-sm">Débattez et trouvez les loups</p>
        </div>
        <div class="px-2 py-1 rounded-full bg-amber-900/50 text-amber-300 text-xs">
          {{ alivePlayers.length }} en vie
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <!-- Dead player view -->
      <div v-if="!currentPlayer.is_alive" class="text-center py-6">
        <div class="text-4xl mb-2 opacity-70">💀</div>
        <p class="text-neutral-300 font-medium">Éliminé</p>
        <p class="text-neutral-500 text-sm">Tu observes en silence...</p>
      </div>

      <!-- Discussion phase -->
      <template v-else>
        <!-- Ready progress -->
        <div class="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-neutral-400">Joueurs prêts</span>
            <span class="text-sm font-bold" :class="allReady ? 'text-green-400' : 'text-amber-400'">
              {{ readyCount }} / {{ totalAlive }}
            </span>
          </div>
          <!-- Progress bar -->
          <div class="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="allReady ? 'bg-green-500' : 'bg-amber-500'"
              :style="{ width: `${(readyCount / totalAlive) * 100}%` }"
            />
          </div>
        </div>

        <!-- Players grid with ready status -->
        <div class="grid grid-cols-3 gap-2 mb-4">
          <div
            v-for="player in alivePlayers"
            :key="player.id"
            class="relative p-2 rounded-xl text-center transition-all duration-300"
            :class="[
              player.id === currentPlayer.id
                ? 'bg-amber-900/30 border-2 border-amber-500/50'
                : 'bg-white/5 border-2 border-transparent',
              isPlayerReady(player.id) && 'ring-2 ring-green-500/50'
            ]"
          >
            <!-- Ready indicator -->
            <div
              v-if="isPlayerReady(player.id)"
              class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs shadow-lg"
            >
              ✓
            </div>

            <div class="text-xl mb-1">
              {{ isPlayerReady(player.id) ? '✅' : '👤' }}
            </div>
            <p
              class="text-xs truncate"
              :class="[
                player.id === currentPlayer.id ? 'text-amber-300 font-medium' : 'text-neutral-400',
                isPlayerReady(player.id) && 'text-green-400'
              ]"
            >
              {{ player.name }}
            </p>
          </div>
        </div>

        <!-- Ready button -->
        <button
          v-if="!isReady"
          class="w-full py-4 rounded-xl font-bold text-lg transition-all"
          :class="isSubmitting
            ? 'bg-neutral-700 text-neutral-400 cursor-wait'
            : 'bg-green-600 text-white hover:bg-green-500 hover:scale-[1.02] active:scale-[0.98]'"
          :disabled="isSubmitting"
          @click="markReady"
        >
          {{ isSubmitting ? '...' : '✓ Je suis prêt à voter' }}
        </button>

        <!-- Already ready -->
        <div v-else class="text-center py-4 rounded-xl bg-green-900/20 border border-green-500/30">
          <div class="text-2xl mb-2">✅</div>
          <p class="text-green-400 font-medium">Tu es prêt</p>
          <p class="text-neutral-500 text-sm">Attends les autres joueurs...</p>
        </div>
      </template>
    </div>
  </div>
</template>
