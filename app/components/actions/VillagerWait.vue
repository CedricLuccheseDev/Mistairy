<script setup lang="ts">
import type { Database } from '#shared/types/database.types'

type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  currentPlayer: Player
}>()

/* --- Computed --- */
const isDead = computed(() => !props.currentPlayer.is_alive)
const isHunter = computed(() => props.currentPlayer.role === 'hunter')
const isVillager = computed(() => props.currentPlayer.role === 'villager')
const isWaitingTurn = computed(() => {
  return !isDead.value && !isHunter.value && !isVillager.value
})
</script>

<template>
  <div class="rounded-2xl border border-neutral-700/50 bg-neutral-900/50 backdrop-blur-sm p-6 text-center">
    <!-- Dead player -->
    <template v-if="isDead">
      <div class="text-5xl mb-3 opacity-50">💀</div>
      <p class="text-neutral-400">Tu observes en silence...</p>
    </template>

    <!-- Hunter (no night action) -->
    <template v-else-if="isHunter">
      <div class="text-5xl mb-3 animate-float">🏹</div>
      <p class="text-neutral-300 font-medium mb-1">Chasseur</p>
      <p class="text-neutral-500 text-sm">Pas d'action de nuit. Attends le jour.</p>
    </template>

    <!-- Villager -->
    <template v-else-if="isVillager">
      <div class="text-5xl mb-3 animate-float">😴</div>
      <p class="text-neutral-300 font-medium mb-1">Le village dort...</p>
      <p class="text-neutral-500 text-sm">Tu te reposes paisiblement.</p>
    </template>

    <!-- Waiting for turn (active role but not their turn yet) -->
    <template v-else-if="isWaitingTurn">
      <div class="text-5xl mb-3 animate-float">⏳</div>
      <p class="text-neutral-300 font-medium mb-1">Patiente...</p>
      <p class="text-neutral-500 text-sm">Ce n'est pas encore ton tour.</p>
    </template>
  </div>
</template>
