<script setup lang="ts">
import type { Database } from '~/types/database.types'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
defineProps<{
  game: Game
  currentPlayer: Player
  alivePlayers: Player[]
}>()

/* --- States --- */
const narrator = useNarrator()

/* --- Lifecycle --- */
onMounted(() => {
  narrator.speak(narrator.messages.dayStart)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Day atmosphere -->
    <div class="text-center py-8">
      <div class="text-4xl mb-2">
        ☀️
      </div>
      <h2 class="text-xl font-semibold">
        Jour {{ game.day_number }}
      </h2>
      <p class="text-gray-400">
        Débattez et trouvez les loups-garous
      </p>
    </div>

    <!-- Dead player view -->
    <UCard v-if="!currentPlayer.is_alive" class="text-center">
      <div class="text-4xl mb-2">
        💀
      </div>
      <p class="text-gray-400">
        Tu es mort. Observe en silence sans influencer les vivants.
      </p>
    </UCard>

    <!-- Discussion phase -->
    <template v-else>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-semibold">Joueurs en vie</span>
            <UBadge color="primary">
              {{ alivePlayers.length }}
            </UBadge>
          </div>
        </template>

        <div class="grid gap-2">
          <div
            v-for="player in alivePlayers"
            :key="player.id"
            class="flex items-center justify-between p-3 rounded-lg bg-gray-800/50"
          >
            <span :class="{ 'font-semibold text-primary': player.id === currentPlayer.id }">
              {{ player.name }}
              <span v-if="player.id === currentPlayer.id" class="text-gray-400">(toi)</span>
            </span>
          </div>
        </div>
      </UCard>

      <UCard class="text-center">
        <div class="text-2xl mb-2">
          💬
        </div>
        <p class="text-gray-400">
          Discutez entre vous pour trouver les loups-garous.
        </p>
        <p class="text-sm text-gray-500 mt-2">
          Le vote commencera bientôt...
        </p>
      </UCard>
    </template>
  </div>
</template>
