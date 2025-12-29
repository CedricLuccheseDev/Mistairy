<script setup lang="ts">
import type { Database } from '~/types/database.types'
import { ROLES } from '~/types/game'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  players: Player[]
  currentPlayer: Player
}>()

/* --- Computed --- */
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
                  {{ ROLES[player.role!]?.emoji }} {{ ROLES[player.role!]?.name }}
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

    <!-- Play again -->
    <UButton
      color="primary"
      size="lg"
      block
      to="/"
    >
      Nouvelle partie
    </UButton>
  </div>
</template>
