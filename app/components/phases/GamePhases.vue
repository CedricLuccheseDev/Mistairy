<script setup lang="ts">
import type { Database } from '#shared/types/database.types'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
defineProps<{
  game: Game
  currentPlayer: Player
  players: Player[]
  alivePlayers: Player[]
  otherWerewolves: Player[]
}>()
</script>

<template>
  <div class="w-full max-w-2xl flex flex-col flex-1 min-h-0 overflow-visible">
    <PhasesNightPhase
      v-if="game.status === 'night'"
      :game="game"
      :current-player="currentPlayer"
      :alive-players="alivePlayers"
      :other-werewolves="otherWerewolves"
    />

    <PhasesDayPhase
      v-else-if="game.status === 'day'"
      :game="game"
      :current-player="currentPlayer"
      :alive-players="alivePlayers"
      :players="players"
    />

    <PhasesVotePhase
      v-else-if="game.status === 'vote'"
      :game="game"
      :current-player="currentPlayer"
      :alive-players="alivePlayers"
      :players="players"
    />

    <PhasesVoteResultPhase
      v-else-if="game.status === 'vote_result'"
      :game="game"
      :players="players"
    />

    <PhasesHunterPhase
      v-else-if="game.status === 'hunter'"
      :game="game"
      :current-player="currentPlayer"
      :alive-players="alivePlayers"
    />

    <GameOver
      v-else-if="game.status === 'finished'"
      :game="game"
      :players="players"
      :current-player="currentPlayer"
    />
  </div>
</template>
