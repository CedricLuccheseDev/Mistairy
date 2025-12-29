<script setup lang="ts">
/* --- States --- */
const playerName = ref('')
const gameCode = ref('')
const isCreating = ref(false)
const isJoining = ref(false)
const showJoinForm = ref(false)
const error = ref('')

/* --- Methods --- */
async function createGame() {
  if (!playerName.value.trim()) {
    error.value = 'Entre ton prénom'
    return
  }

  isCreating.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/game/create', {
      method: 'POST',
      body: { playerName: playerName.value.trim() }
    })

    if (response.playerId) {
      localStorage.setItem('playerId', response.playerId)
    }

    await navigateTo(`/game/${response.code}`)
  }
  catch (e) {
    error.value = 'Erreur lors de la création de la partie'
    console.error(e)
  }
  finally {
    isCreating.value = false
  }
}

async function joinGame() {
  if (!playerName.value.trim()) {
    error.value = 'Entre ton prénom'
    return
  }

  if (!gameCode.value.trim()) {
    error.value = 'Entre le code de la partie'
    return
  }

  isJoining.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/game/join', {
      method: 'POST',
      body: {
        playerName: playerName.value.trim(),
        code: gameCode.value.trim().toUpperCase()
      }
    })

    if (response.playerId) {
      localStorage.setItem('playerId', response.playerId)
    }

    await navigateTo(`/game/${response.code}`)
  }
  catch (e: unknown) {
    const fetchError = e as { data?: { message?: string } }
    error.value = fetchError.data?.message || 'Erreur lors de la connexion'
    console.error(e)
  }
  finally {
    isJoining.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4">
    <!-- Logo & Title -->
    <div class="text-center mb-12">
      <div class="text-7xl mb-4 animate-pulse">
        🐺
      </div>
      <h1 class="text-5xl font-bold gradient-text mb-3">
        Loup Garou
      </h1>
      <p class="text-slate-400">
        Jouez avec vos amis sans cartes physiques
      </p>
    </div>

    <!-- Main Card -->
    <div class="glass rounded-2xl p-6 w-full max-w-sm glow">
      <div class="space-y-5">
        <!-- Player name input -->
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">
            Ton prénom
          </label>
          <UInput
            v-model="playerName"
            placeholder="Comment tu t'appelles ?"
            size="lg"
            autofocus
            class="w-full"
            :ui="{
              base: 'bg-slate-900/50 border-violet-500/30 focus:border-violet-500',
            }"
          />
        </div>

        <!-- Join form (conditional) -->
        <Transition name="slide-up">
          <div v-if="showJoinForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Code de la partie
              </label>
              <UInput
                v-model="gameCode"
                placeholder="ABC123"
                size="lg"
                class="w-full uppercase"
                maxlength="6"
                :ui="{
                  base: 'bg-slate-900/50 border-violet-500/30 focus:border-violet-500 tracking-widest text-center font-mono',
                }"
              />
            </div>

            <div class="flex gap-3">
              <UButton
                color="neutral"
                variant="outline"
                size="lg"
                class="flex-1"
                @click="showJoinForm = false"
              >
                Retour
              </UButton>
              <UButton
                color="primary"
                size="lg"
                class="flex-1 glow"
                :loading="isJoining"
                @click="joinGame"
              >
                Rejoindre
              </UButton>
            </div>
          </div>
        </Transition>

        <!-- Main buttons -->
        <div v-if="!showJoinForm" class="space-y-3">
          <UButton
            color="primary"
            size="lg"
            block
            class="glow"
            :loading="isCreating"
            @click="createGame"
          >
            <span class="mr-2">✨</span>
            Créer une partie
          </UButton>

          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            block
            @click="showJoinForm = true"
          >
            <span class="mr-2">🔗</span>
            Rejoindre une partie
          </UButton>
        </div>

        <!-- Error message -->
        <Transition name="fade">
          <div v-if="error" class="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p class="text-red-400 text-sm text-center">
              {{ error }}
            </p>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Footer info -->
    <p class="mt-8 text-slate-500 text-sm">
      5 à 18 joueurs recommandés
    </p>

    <!-- Admin link -->
    <NuxtLink
      to="/admin"
      class="mt-4 text-xs text-slate-600 hover:text-violet-400 transition-colors"
    >
      Administration
    </NuxtLink>
  </div>
</template>
