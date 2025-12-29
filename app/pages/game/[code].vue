<script setup lang="ts">
import { ROLES } from '~/types/game'

/* --- Props --- */
const route = useRoute()
const gameCode = route.params.code as string

/* --- States --- */
const { game, players, currentPlayer, isLoading, error, isHost, canStartGame, alivePlayers, otherWerewolves, refetch } = useGame(gameCode)
const narrator = useNarrator()
const isStarting = ref(false)
const showRoleModal = ref(false)
const joinName = ref('')
const isJoining = ref(false)
const joinError = ref('')

/* --- Computed --- */
const roleInfo = computed(() => {
  if (!currentPlayer.value?.role) return null
  return ROLES[currentPlayer.value.role]
})

const statusText = computed(() => {
  if (!game.value) return ''
  switch (game.value.status) {
    case 'lobby': return 'En attente des joueurs...'
    case 'night': return `Nuit ${game.value.day_number}`
    case 'day': return `Jour ${game.value.day_number}`
    case 'vote': return 'Vote en cours'
    case 'finished': return game.value.winner === 'village' ? 'Victoire du Village !' : 'Victoire des Loups-Garous !'
    default: return ''
  }
})

/* --- Methods --- */
async function startGame() {
  if (!canStartGame.value) return

  isStarting.value = true

  try {
    await $fetch('/api/game/start', {
      method: 'POST',
      body: {
        gameId: game.value?.id,
        playerId: localStorage.getItem('playerId')
      }
    })
    // Forcer le rafraîchissement pour mettre à jour le statut
    await refetch()
  }
  catch (e) {
    console.error('Failed to start game:', e)
  }
  finally {
    isStarting.value = false
  }
}

function copyCode() {
  navigator.clipboard.writeText(gameCode)
}

async function joinGame() {
  if (!joinName.value.trim()) {
    joinError.value = 'Entre ton prénom'
    return
  }

  isJoining.value = true
  joinError.value = ''

  try {
    const response = await $fetch('/api/game/join', {
      method: 'POST',
      body: {
        playerName: joinName.value.trim(),
        code: gameCode
      }
    })

    if (response.playerId) localStorage.setItem('playerId', response.playerId)

    await refetch()
  }
  catch (e: unknown) {
    const fetchError = e as { data?: { message?: string } }
    joinError.value = fetchError.data?.message || 'Erreur lors de la connexion'
  }
  finally {
    isJoining.value = false
  }
}

/* --- Watchers --- */
watch(() => game.value?.status, async (newStatus, oldStatus) => {
  if (oldStatus === 'lobby' && newStatus === 'night') {
    showRoleModal.value = true
    await narrator.speak('La partie commence. Découvrez votre rôle.')
  }
})

watch(() => currentPlayer.value?.role, (role) => {
  if (role && game.value?.status !== 'lobby') {
    showRoleModal.value = true
  }
})
</script>

<template>
  <div class="min-h-screen p-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center min-h-screen">
      <p class="text-red-500 mb-4">
        {{ error }}
      </p>
      <UButton to="/">
        Retour à l'accueil
      </UButton>
    </div>

    <!-- Join form when not in game -->
    <div v-else-if="!currentPlayer && game" class="flex flex-col items-center justify-center min-h-screen p-4">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2">
          🐺 Partie {{ gameCode }}
        </h1>
        <p class="text-gray-400">
          {{ players.length }} joueur{{ players.length > 1 ? 's' : '' }} dans le lobby
        </p>
      </div>

      <UCard v-if="game.status === 'lobby'" class="w-full max-w-sm">
        <div class="space-y-4">
          <UFormField label="Ton prénom">
            <UInput
              v-model="joinName"
              placeholder="Comment tu t'appelles ?"
              size="lg"
              autofocus
              class="w-full"
              @keyup.enter="joinGame"
            />
          </UFormField>

          <UButton
            color="primary"
            size="lg"
            block
            :loading="isJoining"
            @click="joinGame"
          >
            Rejoindre la partie
          </UButton>

          <p v-if="joinError" class="text-red-500 text-sm text-center">
            {{ joinError }}
          </p>
        </div>
      </UCard>

      <UCard v-else class="w-full max-w-sm text-center">
        <div class="text-4xl mb-4">
          🚫
        </div>
        <p class="text-gray-400 mb-4">
          Cette partie a déjà commencé
        </p>
        <UButton to="/" color="neutral" variant="outline">
          Retour à l'accueil
        </UButton>
      </UCard>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">
            🐺 {{ gameCode }}
          </h1>
          <p class="text-gray-400 text-sm">
            {{ statusText }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <GameTimer
            v-if="game?.phase_end_at && game.status !== 'lobby' && game.status !== 'finished'"
            :end-at="game.phase_end_at"
          />

          <UButton
            v-if="game?.status === 'lobby'"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-clipboard-document"
            @click="copyCode"
          >
            Copier
          </UButton>
        </div>
      </div>

      <!-- Lobby -->
      <template v-if="game?.status === 'lobby'">
        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">
                Joueurs ({{ players.length }})
              </h2>
              <span class="text-sm text-gray-400">Min: 5</span>
            </div>
          </template>

          <div class="space-y-2">
            <div
              v-for="player in players"
              :key="player.id"
              class="flex items-center justify-between p-2 rounded-lg bg-gray-800/50"
            >
              <span :class="{ 'font-semibold text-primary': player.id === currentPlayer?.id }">
                {{ player.name }}
                <span v-if="player.id === currentPlayer?.id" class="text-gray-400">(toi)</span>
              </span>
              <UBadge v-if="player.is_host" color="primary" variant="subtle">
                Hôte
              </UBadge>
            </div>
          </div>

          <template v-if="isHost" #footer>
            <UButton
              color="primary"
              block
              size="lg"
              :disabled="!canStartGame"
              :loading="isStarting"
              @click="startGame"
            >
              {{ canStartGame ? 'Lancer la partie' : `Il faut au moins 5 joueurs (${players.length}/5)` }}
            </UButton>
          </template>
        </UCard>

        <p class="text-center text-gray-500 text-sm">
          Partagez le code <strong>{{ gameCode }}</strong> avec vos amis
        </p>
      </template>

      <!-- Game Phase -->
      <template v-else-if="game?.status === 'night' && currentPlayer">
        <NightPhase
          :game="game"
          :current-player="currentPlayer"
          :alive-players="alivePlayers"
          :other-werewolves="otherWerewolves"
        />
      </template>

      <template v-else-if="game?.status === 'day' && currentPlayer">
        <DayPhase
          :game="game"
          :current-player="currentPlayer"
          :alive-players="alivePlayers"
        />
      </template>

      <template v-else-if="game?.status === 'vote' && currentPlayer">
        <VotePhase
          :game="game"
          :current-player="currentPlayer"
          :alive-players="alivePlayers"
        />
      </template>

      <template v-else-if="game?.status === 'finished' && currentPlayer">
        <GameOver
          :game="game"
          :players="players"
          :current-player="currentPlayer"
        />
      </template>

      <!-- Role Modal -->
      <UModal v-model:open="showRoleModal">
        <template #content>
          <div v-if="roleInfo" class="p-6 text-center">
            <div class="text-6xl mb-4">
              {{ roleInfo.emoji }}
            </div>
            <h2 class="text-2xl font-bold mb-2">
              {{ roleInfo.name }}
            </h2>
            <p class="text-gray-400 mb-6">
              {{ roleInfo.description }}
            </p>

            <div
              v-if="currentPlayer?.role === 'werewolf' && otherWerewolves.length > 0"
              class="mb-6 p-4 rounded-lg bg-red-950/30 border border-red-800"
            >
              <p class="text-sm text-red-400 mb-2">
                Tes alliés loups-garous :
              </p>
              <div class="flex flex-wrap gap-2 justify-center">
                <UBadge v-for="wolf in otherWerewolves" :key="wolf.id" color="error">
                  {{ wolf.name }}
                </UBadge>
              </div>
            </div>

            <UButton color="primary" size="lg" @click="showRoleModal = false">
              J'ai compris
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>
