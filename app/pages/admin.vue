<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { ROLES } from '~/types/game'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- States --- */
const client = useSupabaseClient<Database>()
const games = ref<(Game & { players: Player[] })[]>([])
const isLoading = ref(true)
const selectedGame = ref<string | null>(null)
const isDeleting = ref<string | null>(null)
let channel: RealtimeChannel | null = null

/* --- Computed --- */
const selectedGameData = computed(() =>
  games.value.find(g => g.id === selectedGame.value)
)

/* --- Methods --- */
async function fetchGames() {
  isLoading.value = true

  const { data: gamesData } = await client
    .from('games')
    .select('*')
    .order('created_at', { ascending: false })

  if (gamesData) {
    const gamesWithPlayers = await Promise.all(
      gamesData.map(async (game) => {
        const { data: players } = await client
          .from('players')
          .select('*')
          .eq('game_id', game.id)
          .order('created_at', { ascending: true })

        return { ...game, players: players || [] }
      })
    )
    games.value = gamesWithPlayers
  }

  isLoading.value = false
}

async function deleteGame(gameId: string) {
  if (!confirm('Supprimer cette partie ?')) return

  isDeleting.value = gameId

  try {
    await $fetch('/api/admin/delete-game', {
      method: 'POST',
      body: { gameId }
    })

    games.value = games.value.filter(g => g.id !== gameId)
    if (selectedGame.value === gameId) {
      selectedGame.value = null
    }
  }
  catch (e) {
    console.error('Delete failed:', e)
    alert('Erreur lors de la suppression')
  }
  finally {
    isDeleting.value = null
  }
}

async function forceStatus(gameId: string, status: Game['status']) {
  await client
    .from('games')
    .update({ status })
    .eq('id', gameId)

  await fetchGames()
}

async function killPlayer(playerId: string) {
  await client
    .from('players')
    .update({ is_alive: false })
    .eq('id', playerId)

  await fetchGames()
}

async function revivePlayer(playerId: string) {
  await client
    .from('players')
    .update({ is_alive: true })
    .eq('id', playerId)

  await fetchGames()
}

function getStatusColor(status: Game['status']) {
  switch (status) {
    case 'lobby': return 'info'
    case 'night': return 'primary'
    case 'day': return 'warning'
    case 'vote': return 'error'
    case 'finished': return 'success'
    default: return 'neutral'
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/* --- Realtime --- */
function subscribeToChanges() {
  channel = client
    .channel('admin-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'games' },
      () => fetchGames()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players' },
      () => fetchGames()
    )
    .subscribe()
}

/* --- Lifecycle --- */
onMounted(() => {
  fetchGames()
  subscribeToChanges()
})

onUnmounted(() => {
  if (channel) {
    client.removeChannel(channel)
  }
})
</script>

<template>
  <div class="min-h-screen p-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">
            🛠️ Admin
          </h1>
          <p class="text-gray-400">
            Gestion des parties
          </p>
        </div>

        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-arrow-path"
            :loading="isLoading"
            @click="fetchGames"
          >
            Rafraîchir
          </UButton>
          <UButton to="/" color="neutral" variant="ghost">
            Accueil
          </UButton>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="text-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" />
      </div>

      <!-- Games list -->
      <div v-else class="grid lg:grid-cols-2 gap-4">
        <!-- Left: Games list -->
        <div class="space-y-3">
          <h2 class="font-semibold text-gray-400 mb-2">
            {{ games.length }} partie(s)
          </h2>

          <div v-if="games.length === 0" class="text-center py-8 text-gray-500">
            Aucune partie
          </div>

          <div
            v-for="game in games"
            :key="game.id"
            class="p-4 rounded-lg border cursor-pointer transition-colors"
            :class="selectedGame === game.id ? 'border-primary bg-primary/10' : 'border-gray-700 hover:border-gray-600'"
            @click="selectedGame = game.id"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-lg">{{ game.code }}</span>
                <UBadge :color="getStatusColor(game.status)" size="sm">
                  {{ game.status }}
                </UBadge>
              </div>
              <span class="text-sm text-gray-500">
                {{ formatDate(game.created_at) }}
              </span>
            </div>

            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-400">
                {{ game.players.length }} joueur(s)
                <span v-if="game.status !== 'lobby'">
                  • Jour {{ game.day_number }}
                </span>
              </span>

              <UButton
                color="error"
                variant="ghost"
                size="xs"
                icon="i-heroicons-trash"
                :loading="isDeleting === game.id"
                @click.stop="deleteGame(game.id)"
              />
            </div>
          </div>
        </div>

        <!-- Right: Game details -->
        <div>
          <UCard v-if="selectedGameData">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-xl">{{ selectedGameData.code }}</span>
                  <UBadge :color="getStatusColor(selectedGameData.status)">
                    {{ selectedGameData.status }}
                  </UBadge>
                </div>
                <span v-if="selectedGameData.winner" class="text-sm">
                  Gagnant: {{ selectedGameData.winner === 'village' ? '👥 Village' : '🐺 Loups' }}
                </span>
              </div>
            </template>

            <!-- Game info -->
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-400">Jour:</span>
                  <span class="ml-2 font-semibold">{{ selectedGameData.day_number }}</span>
                </div>
                <div>
                  <span class="text-gray-400">Créé:</span>
                  <span class="ml-2">{{ formatDate(selectedGameData.created_at) }}</span>
                </div>
              </div>

              <!-- Force status -->
              <div>
                <p class="text-sm text-gray-400 mb-2">
                  Forcer le statut:
                </p>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-for="status in ['lobby', 'night', 'day', 'vote', 'finished']"
                    :key="status"
                    size="xs"
                    :color="selectedGameData.status === status ? 'primary' : 'neutral'"
                    :variant="selectedGameData.status === status ? 'solid' : 'outline'"
                    @click="forceStatus(selectedGameData.id, status as Game['status'])"
                  >
                    {{ status }}
                  </UButton>
                </div>
              </div>

              <!-- Players -->
              <div>
                <p class="text-sm text-gray-400 mb-2">
                  Joueurs ({{ selectedGameData.players.length }}):
                </p>
                <div class="space-y-2 max-h-64 overflow-y-auto">
                  <div
                    v-for="player in selectedGameData.players"
                    :key="player.id"
                    class="flex items-center justify-between p-2 rounded bg-gray-800/50"
                    :class="{ 'opacity-50': !player.is_alive }"
                  >
                    <div class="flex items-center gap-2">
                      <span v-if="player.role" class="text-lg">
                        {{ ROLES[player.role]?.emoji || '?' }}
                      </span>
                      <span :class="{ 'line-through': !player.is_alive }">
                        {{ player.name }}
                      </span>
                      <UBadge v-if="player.is_host" color="primary" size="xs">
                        Hôte
                      </UBadge>
                      <UBadge v-if="player.role" color="neutral" size="xs">
                        {{ player.role }}
                      </UBadge>
                    </div>

                    <div class="flex gap-1">
                      <UButton
                        v-if="player.is_alive"
                        size="xs"
                        color="error"
                        variant="ghost"
                        icon="i-heroicons-x-mark"
                        @click="killPlayer(player.id)"
                      />
                      <UButton
                        v-else
                        size="xs"
                        color="success"
                        variant="ghost"
                        icon="i-heroicons-heart"
                        @click="revivePlayer(player.id)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Settings -->
              <div v-if="selectedGameData.settings" class="text-sm">
                <p class="text-gray-400 mb-1">
                  Paramètres:
                </p>
                <pre class="bg-gray-800 p-2 rounded text-xs overflow-x-auto">{{ JSON.stringify(selectedGameData.settings, null, 2) }}</pre>
              </div>
            </div>

            <template #footer>
              <UButton
                color="error"
                variant="outline"
                block
                icon="i-heroicons-trash"
                :loading="isDeleting === selectedGameData.id"
                @click="deleteGame(selectedGameData.id)"
              >
                Supprimer la partie
              </UButton>
            </template>
          </UCard>

          <div v-else class="text-center py-12 text-gray-500">
            Sélectionne une partie pour voir les détails
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
