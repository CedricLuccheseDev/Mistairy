<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'
import { ROLES } from '#shared/types/game'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- States --- */
const client = useSupabaseClient<Database>()
const games = ref<(Game & { players: Player[] })[]>([])
const isLoading = ref(true)
const selectedGame = ref<(Game & { players: Player[] }) | null>(null)
const isDeleting = ref<string | null>(null)
const isDeletingAll = ref(false)
let channel: RealtimeChannel | null = null

// Modal states
const showCreateModal = ref(false)
const showDetailsModal = ref(false)

// Create game states
const createPlayerCount = ref(5)
const isCreating = ref(false)
const createError = ref('')
const createdGame = ref<{ code: string; players: { name: string; id: string }[] } | null>(null)

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
  isDeleting.value = gameId

  try {
    await $fetch('/api/admin/delete-game', {
      method: 'POST',
      body: { gameId }
    })

    games.value = games.value.filter(g => g.id !== gameId)
    if (selectedGame.value?.id === gameId) {
      showDetailsModal.value = false
      selectedGame.value = null
    }
  }
  catch (e) {
    console.error('Delete failed:', e)
  }
  finally {
    isDeleting.value = null
  }
}

async function deleteAllGames() {
  if (!confirm('⚠️ Supprimer TOUTES les parties ? Cette action est irréversible.')) return

  isDeletingAll.value = true
  try {
    for (const game of games.value) {
      await $fetch('/api/admin/delete-game', {
        method: 'POST',
        body: { gameId: game.id }
      })
    }
    games.value = []
    showDetailsModal.value = false
    selectedGame.value = null
  }
  catch (e) {
    console.error('Delete all failed:', e)
  }
  finally {
    isDeletingAll.value = false
  }
}

async function forceStatus(gameId: string, status: Game['status']) {
  await client
    .from('games')
    .update({ status })
    .eq('id', gameId)

  await fetchGames()
  // Update selected game
  if (selectedGame.value?.id === gameId) {
    selectedGame.value = games.value.find(g => g.id === gameId) || null
  }
}

async function killPlayer(playerId: string) {
  await client
    .from('players')
    .update({ is_alive: false })
    .eq('id', playerId)

  await fetchGames()
  if (selectedGame.value) {
    selectedGame.value = games.value.find(g => g.id === selectedGame.value?.id) || null
  }
}

async function revivePlayer(playerId: string) {
  await client
    .from('players')
    .update({ is_alive: true })
    .eq('id', playerId)

  await fetchGames()
  if (selectedGame.value) {
    selectedGame.value = games.value.find(g => g.id === selectedGame.value?.id) || null
  }
}

function openGameDetails(game: Game & { players: Player[] }) {
  selectedGame.value = game
  showDetailsModal.value = true
}

function getStatusColor(status: Game['status']) {
  switch (status) {
    case 'lobby': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'night': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
    case 'day': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'vote': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'finished': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    default: return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
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

/* --- Create Game Methods --- */
async function createTestGame() {
  if (createPlayerCount.value < 5 || createPlayerCount.value > 10) {
    createError.value = 'Entre 5 et 10 joueurs'
    return
  }

  isCreating.value = true
  createError.value = ''
  createdGame.value = null

  try {
    const createResponse = await $fetch('/api/game/create', {
      method: 'POST'
    })

    const players: { name: string; id: string }[] = []

    for (let i = 1; i <= createPlayerCount.value; i++) {
      const response = await $fetch('/api/game/join', {
        method: 'POST',
        body: {
          playerName: `Joueur ${i}`,
          code: createResponse.code
        }
      })

      players.push({
        name: i === 1 ? 'Joueur 1 (Hôte)' : `Joueur ${i}`,
        id: response.playerId
      })
    }

    createdGame.value = { code: createResponse.code, players }
    await fetchGames()
  }
  catch (e) {
    createError.value = 'Erreur lors de la création'
    console.error(e)
  }
  finally {
    isCreating.value = false
  }
}

function openAsPlayer(code: string, playerId: string) {
  localStorage.setItem('playerId', playerId)
  window.open(`/game/${code}`, '_blank')
}

function resetCreateModal() {
  createdGame.value = null
  createError.value = ''
  showCreateModal.value = false
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
  <div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
    <!-- Header -->
    <header class="border-b border-white/5 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <NuxtLink
            to="/"
            class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            🐺
          </NuxtLink>
          <div>
            <h1 class="text-xl font-bold text-white">Administration</h1>
            <p class="text-neutral-500 text-sm">{{ games.length }} partie(s)</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors cursor-pointer"
            @click="showCreateModal = true"
          >
            ➕ Créer une partie
          </button>
          <button
            class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            :disabled="isLoading"
            @click="fetchGames"
          >
            {{ isLoading ? '...' : '🔄' }}
          </button>
          <button
            v-if="games.length > 0"
            class="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
            :disabled="isDeletingAll"
            @click="deleteAllGames"
          >
            {{ isDeletingAll ? '...' : '🗑️ Tout supprimer' }}
          </button>
        </div>
      </div>
    </header>

    <div class="max-w-6xl mx-auto p-4">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="text-5xl mb-4 animate-pulse">🐺</div>
          <p class="text-neutral-500">Chargement...</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="games.length === 0" class="text-center py-20">
        <div class="text-5xl mb-4">📭</div>
        <p class="text-neutral-400 mb-4">Aucune partie</p>
        <button
          class="px-6 py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-500 transition-colors cursor-pointer"
          @click="showCreateModal = true"
        >
          ➕ Créer une partie de test
        </button>
      </div>

      <!-- Games Table -->
      <div v-else class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/10 text-left text-sm text-neutral-400">
              <th class="px-4 py-3 font-medium">Code</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 font-medium">Joueurs</th>
              <th class="px-4 py-3 font-medium">Jour</th>
              <th class="px-4 py-3 font-medium">Créé</th>
              <th class="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="game in games"
              :key="game.id"
              class="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
              @click="openGameDetails(game)"
            >
              <td class="px-4 py-3">
                <span class="font-mono font-bold text-white">{{ game.code }}</span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="px-2 py-1 rounded-full text-xs border"
                  :class="getStatusColor(game.status)"
                >
                  {{ game.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-neutral-300">
                {{ game.players.filter(p => p.is_alive).length }}/{{ game.players.length }}
              </td>
              <td class="px-4 py-3 text-neutral-400">
                {{ game.day_number }}
              </td>
              <td class="px-4 py-3 text-neutral-500 text-sm">
                {{ formatDate(game.created_at) }}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2" @click.stop>
                  <button
                    class="p-2 rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    title="Voir les détails"
                    @click="openGameDetails(game)"
                  >
                    👁️
                  </button>
                  <button
                    class="p-2 rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    title="Ouvrir la partie"
                    @click="navigateTo(`/game/${game.code}`)"
                  >
                    🎮
                  </button>
                  <button
                    class="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                    title="Supprimer"
                    :disabled="isDeleting === game.id"
                    @click="deleteGame(game.id)"
                  >
                    {{ isDeleting === game.id ? '...' : '🗑️' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Game Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-6">
          <template v-if="!createdGame">
            <h2 class="text-xl font-bold text-white mb-2">Créer une partie de test</h2>
            <p class="text-neutral-400 text-sm mb-6">Génère plusieurs joueurs automatiquement</p>

            <!-- Player count -->
            <div class="mb-6">
              <label class="block text-sm text-neutral-400 mb-3">Nombre de joueurs</label>
              <div class="flex items-center gap-2">
                <button
                  v-for="count in [5, 6, 7, 8, 9, 10]"
                  :key="count"
                  class="w-12 h-12 rounded-xl border text-lg font-semibold transition-all cursor-pointer"
                  :class="createPlayerCount === count
                    ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                    : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10'"
                  @click="createPlayerCount = count"
                >
                  {{ count }}
                </button>
              </div>
            </div>

            <!-- Error -->
            <div v-if="createError" class="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <p class="text-red-400 text-sm text-center">{{ createError }}</p>
            </div>

            <!-- Buttons -->
            <div class="flex gap-3">
              <button
                class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-neutral-400 font-medium hover:bg-white/10 transition-colors cursor-pointer"
                @click="resetCreateModal"
              >
                Annuler
              </button>
              <button
                class="flex-1 px-4 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-all cursor-pointer disabled:opacity-50"
                :disabled="isCreating"
                @click="createTestGame"
              >
                <span v-if="isCreating">Création...</span>
                <span v-else>🎮 Créer {{ createPlayerCount }} joueurs</span>
              </button>
            </div>
          </template>

          <template v-else>
            <!-- Game created -->
            <div class="text-center mb-6">
              <p class="text-violet-400 text-sm mb-2">Partie créée !</p>
              <p class="text-4xl font-black text-white tracking-wider">{{ createdGame.code }}</p>
            </div>

            <!-- Players list -->
            <div class="space-y-2 mb-6 max-h-64 overflow-y-auto">
              <div
                v-for="(player, index) in createdGame.players"
                :key="player.id"
                class="flex items-center justify-between p-3 rounded-xl bg-white/5"
              >
                <div class="flex items-center gap-3">
                  <span class="text-lg">{{ index === 0 ? '👑' : '👤' }}</span>
                  <span class="text-white">{{ player.name }}</span>
                </div>
                <button
                  class="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors cursor-pointer"
                  @click="openAsPlayer(createdGame!.code, player.id)"
                >
                  Ouvrir
                </button>
              </div>
            </div>

            <button
              class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-neutral-400 font-medium hover:bg-white/10 transition-colors cursor-pointer"
              @click="resetCreateModal"
            >
              Fermer
            </button>
          </template>
        </div>
      </template>
    </UModal>

    <!-- Game Details Modal -->
    <UModal v-model:open="showDetailsModal" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <div v-if="selectedGame" class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <span class="font-mono font-bold text-3xl text-white">{{ selectedGame.code }}</span>
              <span
                class="px-3 py-1 rounded-full text-sm border"
                :class="getStatusColor(selectedGame.status)"
              >
                {{ selectedGame.status }}
              </span>
            </div>
            <div v-if="selectedGame.winner" class="text-2xl">
              {{ selectedGame.winner === 'village' ? '👥' : '🐺' }}
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="p-4 rounded-xl bg-white/5 text-center">
              <p class="text-2xl font-bold text-white">{{ selectedGame.day_number }}</p>
              <p class="text-xs text-neutral-500">Jour</p>
            </div>
            <div class="p-4 rounded-xl bg-white/5 text-center">
              <p class="text-2xl font-bold text-white">{{ selectedGame.players.length }}</p>
              <p class="text-xs text-neutral-500">Joueurs</p>
            </div>
            <div class="p-4 rounded-xl bg-emerald-500/10 text-center">
              <p class="text-2xl font-bold text-emerald-400">{{ selectedGame.players.filter(p => p.is_alive).length }}</p>
              <p class="text-xs text-neutral-500">En vie</p>
            </div>
            <div class="p-4 rounded-xl bg-red-500/10 text-center">
              <p class="text-2xl font-bold text-red-400">{{ selectedGame.players.filter(p => !p.is_alive).length }}</p>
              <p class="text-xs text-neutral-500">Morts</p>
            </div>
          </div>

          <!-- Force status -->
          <div class="mb-6">
            <p class="text-sm text-neutral-500 mb-2">Forcer le statut</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="status in ['lobby', 'night', 'day', 'vote', 'finished']"
                :key="status"
                class="px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                :class="selectedGame.status === status
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-neutral-400 hover:bg-white/10'"
                @click="forceStatus(selectedGame.id, status as Game['status'])"
              >
                {{ status }}
              </button>
            </div>
          </div>

          <!-- Players -->
          <div class="mb-6">
            <p class="text-sm text-neutral-500 mb-2">Joueurs</p>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div
                v-for="player in selectedGame.players"
                :key="player.id"
                class="flex items-center justify-between p-3 rounded-xl bg-white/5"
                :class="{ 'opacity-50': !player.is_alive }"
              >
                <div class="flex items-center gap-3">
                  <span v-if="player.role" class="text-xl">
                    {{ ROLES[player.role]?.emoji || '?' }}
                  </span>
                  <div>
                    <span class="text-white" :class="{ 'line-through': !player.is_alive }">
                      {{ player.name }}
                    </span>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span v-if="player.is_host" class="text-xs text-violet-400">Hôte</span>
                      <span v-if="player.role" class="text-xs text-neutral-500">{{ player.role }}</span>
                    </div>
                  </div>
                </div>

                <button
                  v-if="player.is_alive"
                  class="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  @click="killPlayer(player.id)"
                >
                  💀
                </button>
                <button
                  v-else
                  class="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  @click="revivePlayer(player.id)"
                >
                  💚
                </button>
              </div>
            </div>
          </div>

          <!-- Settings JSON -->
          <div v-if="selectedGame.settings" class="mb-6">
            <p class="text-sm text-neutral-500 mb-2">Paramètres</p>
            <pre class="bg-slate-900 p-3 rounded-xl text-xs text-neutral-400 overflow-x-auto">{{ JSON.stringify(selectedGame.settings, null, 2) }}</pre>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-neutral-400 font-medium hover:bg-white/10 transition-colors cursor-pointer"
              @click="showDetailsModal = false"
            >
              Fermer
            </button>
            <button
              class="px-4 py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-500 transition-colors cursor-pointer"
              @click="navigateTo(`/game/${selectedGame.code}`)"
            >
              🎮 Ouvrir
            </button>
            <button
              class="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
              :disabled="isDeleting === selectedGame.id"
              @click="deleteGame(selectedGame.id)"
            >
              {{ isDeleting === selectedGame.id ? '...' : '🗑️' }}
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
