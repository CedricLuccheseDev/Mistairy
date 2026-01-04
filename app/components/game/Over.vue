<script setup lang="ts">
import type { Database } from '#shared/types/database.types'
import { ROLES_CONFIG } from '#shared/config/roles.config'
import * as gameApi from '~/services/gameApi'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  players: Player[]
  currentPlayer: Player
}>()

/* --- Services --- */
const toast = useToast()

/* --- States --- */
const isRestarting = ref(false)

/* --- Computed --- */
const isHost = computed(() =>
  props.currentPlayer.is_host || props.game.host_id === props.currentPlayer.id
)

const isWinner = computed(() => {
  if (!props.currentPlayer.role || !props.game.winner) return false

  if (props.game.winner === 'werewolf') {
    return props.currentPlayer.role === 'werewolf'
  }
  return props.currentPlayer.role !== 'werewolf'
})

const werewolves = computed(() =>
  props.players.filter(p => p.role === 'werewolf')
)

const villagers = computed(() =>
  props.players.filter(p => p.role !== 'werewolf')
)

/* --- Methods --- */
function shareLink() {
  const baseUrl = `${window.location.origin}/game/${props.game.code}`
  if (navigator.share) {
    navigator.share({ title: `Mistairy - ${props.game.code}`, url: baseUrl })
  }
  else {
    navigator.clipboard.writeText(baseUrl)
    toast.add({ title: '🔗 Lien copié !', color: 'success' })
  }
}

async function restart() {
  if (isRestarting.value) return

  isRestarting.value = true
  try {
    await gameApi.restartGame(props.game.id, props.currentPlayer.id)
    toast.add({ title: '🔄 Partie relancée !', color: 'success' })
  }
  catch (e) {
    console.error('Restart failed:', e)
    toast.add({ title: 'Erreur lors du relancement', color: 'error' })
  }
  finally {
    isRestarting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Victory banner -->
    <div class="text-center py-8">
      <div class="text-6xl mb-4">
        {{ game.winner === 'village' ? '🎉' : '🐺' }}
      </div>
      <h2 class="text-2xl font-bold mb-2">
        {{ game.winner === 'village' ? 'Victoire du Village !' : 'Victoire des Loups-Garous !' }}
      </h2>
      <p
        class="text-lg"
        :class="isWinner ? 'text-green-500' : 'text-red-500'"
      >
        {{ isWinner ? 'Tu as gagné !' : 'Tu as perdu...' }}
      </p>
    </div>

    <!-- Reveal all roles -->
    <UCard>
      <template #header>
        <span class="font-semibold">Récapitulatif des rôles</span>
      </template>

      <div class="space-y-4">
        <!-- Werewolves -->
        <div>
          <h3 class="text-red-400 font-semibold mb-2">
            🐺 Loups-Garous
          </h3>
          <div class="grid gap-2">
            <div
              v-for="player in werewolves"
              :key="player.id"
              class="flex items-center justify-between p-2 rounded bg-red-950/30"
            >
              <span :class="{ 'line-through text-gray-500': !player.is_alive }">
                {{ player.name }}
              </span>
              <UBadge :color="player.is_alive ? 'success' : 'neutral'">
                {{ player.is_alive ? 'Vivant' : 'Mort' }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- Villagers -->
        <div>
          <h3 class="text-blue-400 font-semibold mb-2">
            👥 Village
          </h3>
          <div class="grid gap-2">
            <div
              v-for="player in villagers"
              :key="player.id"
              class="flex items-center justify-between p-2 rounded bg-blue-950/30"
            >
              <div class="flex items-center gap-2">
                <span :class="{ 'line-through text-gray-500': !player.is_alive }">
                  {{ player.name }}
                </span>
                <span class="text-sm text-gray-400">
                  {{ ROLES_CONFIG[player.role!]?.emoji }} {{ ROLES_CONFIG[player.role!]?.name }}
                </span>
              </div>
              <UBadge :color="player.is_alive ? 'success' : 'neutral'">
                {{ player.is_alive ? 'Vivant' : 'Mort' }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Actions (same as lobby) -->
    <div class="flex flex-col gap-3">
      <!-- Restart button (host only) -->
      <button
        v-if="isHost"
        class="w-full px-4 py-4 rounded-xl font-bold text-lg transition-all"
        :class="isRestarting
          ? 'bg-neutral-700 text-neutral-400 cursor-wait'
          : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/20'"
        :disabled="isRestarting"
        @click="restart"
      >
        {{ isRestarting ? '...' : '🔄 Relancer la partie' }}
      </button>

      <!-- Other actions -->
      <div class="flex gap-2 justify-center">
        <button
          class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          @click="shareLink"
        >
          <span>🔗</span>
          <span>Partager</span>
        </button>
        <NuxtLink
          to="/"
          class="flex-1 px-4 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-colors flex items-center justify-center gap-2 font-bold"
        >
          <span>🎮</span>
          <span>Nouvelle partie</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
