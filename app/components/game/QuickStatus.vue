<script setup lang="ts">
import type { Game, Player } from '#shared/types/game'

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: Player
  needsAction: boolean
}>()

/* --- Computed --- */
const statusConfig = computed(() => {
  const { status } = props.game
  const isAlive = props.currentPlayer.is_alive
  const role = props.currentPlayer.role

  if (!isAlive) {
    return {
      icon: '💀',
      title: 'Éliminé',
      subtitle: 'Tu observes la partie',
      color: 'text-neutral-400',
      bgClass: 'bg-neutral-900/90'
    }
  }

  if (status === 'night') {
    if (role === 'werewolf') {
      return {
        icon: '🐺',
        title: 'C\'est la nuit',
        subtitle: props.needsAction ? 'Choisis ta victime' : 'Vote enregistré',
        color: 'text-red-400',
        bgClass: 'bg-red-950/50'
      }
    }
    if (role === 'seer') {
      return {
        icon: '🔮',
        title: 'C\'est la nuit',
        subtitle: props.needsAction ? 'Sonde un joueur' : 'Vision effectuée',
        color: 'text-violet-400',
        bgClass: 'bg-violet-950/50'
      }
    }
    if (role === 'witch') {
      return {
        icon: '🧪',
        title: 'C\'est la nuit',
        subtitle: props.needsAction ? 'Utilise tes potions' : 'Action effectuée',
        color: 'text-emerald-400',
        bgClass: 'bg-emerald-950/50'
      }
    }
    return {
      icon: '😴',
      title: 'C\'est la nuit',
      subtitle: 'Le village dort...',
      color: 'text-indigo-400',
      bgClass: 'bg-indigo-950/50'
    }
  }

  if (status === 'day') {
    return {
      icon: '☀️',
      title: 'Jour',
      subtitle: 'Discutez et trouvez le loup !',
      color: 'text-amber-400',
      bgClass: 'bg-amber-950/50'
    }
  }

  if (status === 'vote') {
    return {
      icon: '🗳️',
      title: 'Vote',
      subtitle: props.needsAction ? 'Vote pour éliminer quelqu\'un' : 'Vote enregistré',
      color: 'text-orange-400',
      bgClass: 'bg-orange-950/50'
    }
  }

  if (status === 'finished') {
    const won = (props.game.winner === 'village' && role !== 'werewolf') ||
                (props.game.winner === 'werewolf' && role === 'werewolf')
    return {
      icon: won ? '🎉' : '😢',
      title: won ? 'Victoire !' : 'Défaite',
      subtitle: props.game.winner === 'village' ? 'Le village a gagné' : 'Les loups ont gagné',
      color: won ? 'text-green-400' : 'text-red-400',
      bgClass: won ? 'bg-green-950/50' : 'bg-red-950/50'
    }
  }

  return {
    icon: '⏳',
    title: 'En attente',
    subtitle: 'La partie va commencer',
    color: 'text-neutral-400',
    bgClass: 'bg-neutral-900/90'
  }
})
</script>

<template>
  <div
    class="rounded-2xl border border-neutral-700/50 backdrop-blur-sm overflow-hidden transition-all duration-500"
    :class="[statusConfig.bgClass, needsAction && 'animate-attention']"
  >
    <div class="px-6 py-5 flex items-center gap-4">
      <!-- Big icon with animation -->
      <div
        class="text-5xl"
        :class="needsAction ? 'animate-pulse-glow' : 'animate-float'"
      >
        {{ statusConfig.icon }}
      </div>

      <!-- Status text -->
      <div class="flex-1">
        <h2 class="text-xl font-bold" :class="statusConfig.color">
          {{ statusConfig.title }}
        </h2>
        <p class="text-sm text-neutral-400 mt-0.5">
          {{ statusConfig.subtitle }}
        </p>
      </div>

      <!-- Action indicator -->
      <div
        v-if="needsAction"
        class="w-3 h-3 rounded-full bg-current animate-pulse"
        :class="statusConfig.color"
      />
    </div>
  </div>
</template>
