<script setup lang="ts">
/* --- States --- */
const gameCode = ref('')
const playerCount = ref(5)
const isCreating = ref(false)
const createdPlayers = ref<{ name: string, token: string, id: string }[]>([])
const error = ref('')

/* --- Methods --- */
async function createTestGame() {
  if (playerCount.value < 5 || playerCount.value > 10) {
    error.value = 'Entre 5 et 10 joueurs'
    return
  }

  isCreating.value = true
  error.value = ''
  createdPlayers.value = []

  try {
    // Create game with first player
    const firstResponse = await $fetch('/api/game/create', {
      method: 'POST',
      body: { playerName: 'Joueur 1' }
    })

    gameCode.value = firstResponse.code
    createdPlayers.value.push({
      name: 'Joueur 1 (Hôte)',
      token: firstResponse.playerToken,
      id: firstResponse.playerId
    })

    // Add remaining players
    for (let i = 2; i <= playerCount.value; i++) {
      const response = await $fetch('/api/game/join', {
        method: 'POST',
        body: {
          playerName: `Joueur ${i}`,
          code: gameCode.value
        }
      })

      createdPlayers.value.push({
        name: `Joueur ${i}`,
        token: response.playerToken,
        id: response.playerId
      })
    }
  }
  catch (e) {
    error.value = 'Erreur lors de la création'
    console.error(e)
  }
  finally {
    isCreating.value = false
  }
}

function openAsPlayer(player: { token: string, id: string }) {
  localStorage.setItem('playerToken', player.token)
  localStorage.setItem('playerId', player.id)
  window.open(`/game/${gameCode.value}`, '_blank')
}

function copyPlayerLink(player: { token: string, id: string }) {
  const url = `${window.location.origin}/game/${gameCode.value}?token=${player.token}&id=${player.id}`
  navigator.clipboard.writeText(url)
}
</script>

<template>
  <div class="min-h-screen p-4 max-w-2xl mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold mb-2">
        🧪 Mode Debug
      </h1>
      <p class="text-gray-400">
        Crée une partie de test avec plusieurs joueurs
      </p>
    </div>

    <UCard v-if="!gameCode" class="mb-4">
      <template #header>
        <span class="font-semibold">Créer une partie de test</span>
      </template>

      <div class="space-y-4">
        <UFormField label="Nombre de joueurs">
          <UInput
            v-model.number="playerCount"
            type="number"
            min="5"
            max="10"
            class="w-full"
          />
        </UFormField>

        <UButton
          color="primary"
          block
          :loading="isCreating"
          @click="createTestGame"
        >
          Créer {{ playerCount }} joueurs
        </UButton>

        <p v-if="error" class="text-red-500 text-sm">
          {{ error }}
        </p>
      </div>
    </UCard>

    <template v-else>
      <UCard class="mb-4">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">Partie créée</span>
            <UBadge color="primary" size="lg">
              {{ gameCode }}
            </UBadge>
          </div>
        </template>

        <p class="text-gray-400 text-sm mb-4">
          Clique sur un joueur pour l'ouvrir dans un nouvel onglet.
          Chaque onglet sera connecté en tant que ce joueur.
        </p>

        <div class="space-y-2">
          <div
            v-for="(player, index) in createdPlayers"
            :key="player.id"
            class="flex items-center justify-between p-3 rounded-lg bg-gray-800/50"
          >
            <span>
              {{ player.name }}
              <span v-if="index === 0" class="text-primary">(lance la partie)</span>
            </span>
            <div class="flex gap-2">
              <UButton
                size="sm"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-clipboard-document"
                @click="copyPlayerLink(player)"
              />
              <UButton
                size="sm"
                color="primary"
                @click="openAsPlayer(player)"
              >
                Ouvrir
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <span class="font-semibold">Instructions</span>
        </template>

        <ol class="list-decimal list-inside space-y-2 text-gray-300">
          <li>Clique sur <strong>"Ouvrir"</strong> pour chaque joueur (nouvel onglet)</li>
          <li>Avec <strong>Joueur 1</strong>, clique sur "Lancer la partie"</li>
          <li>Chaque joueur verra son rôle</li>
          <li>Joue les différentes phases de jeu !</li>
        </ol>
      </UCard>

      <UButton
        class="mt-4"
        color="neutral"
        variant="outline"
        block
        @click="gameCode = ''; createdPlayers = []"
      >
        Nouvelle partie de test
      </UButton>
    </template>

    <div class="mt-8 text-center">
      <UButton to="/" color="neutral" variant="ghost">
        ← Retour à l'accueil
      </UButton>
    </div>
  </div>
</template>
