<script setup lang="ts">
/* --- Props --- */
defineProps<{
  currentRole: 'werewolf' | 'seer' | 'witch' | 'waiting' | null
  isMyTurn?: boolean
}>()

/* --- Config --- */
const roleConfig = {
  werewolf: {
    icon: '🐺',
    label: 'Les Loups-Garous',
    action: 'choisissent leur victime...',
    color: 'text-red-400',
    bg: 'bg-red-950/50',
    border: 'border-red-500/30'
  },
  seer: {
    icon: '🔮',
    label: 'La Voyante',
    action: 'observe le village...',
    color: 'text-violet-400',
    bg: 'bg-violet-950/50',
    border: 'border-violet-500/30'
  },
  witch: {
    icon: '🧪',
    label: 'La Sorcière',
    action: 'prépare ses potions...',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/50',
    border: 'border-emerald-500/30'
  },
  waiting: {
    icon: '⏳',
    label: 'En attente',
    action: 'Passage à la phase suivante...',
    color: 'text-neutral-400',
    bg: 'bg-neutral-900/50',
    border: 'border-neutral-500/30'
  }
}
</script>

<template>
  <div
    v-if="currentRole && roleConfig[currentRole]"
    class="rounded-2xl border backdrop-blur-sm p-4 transition-all duration-500"
    :class="[
      roleConfig[currentRole].bg,
      roleConfig[currentRole].border,
      isMyTurn && 'ring-2 ring-offset-2 ring-offset-transparent animate-pulse-glow',
      isMyTurn && (currentRole === 'werewolf' ? 'ring-red-500' : currentRole === 'seer' ? 'ring-violet-500' : 'ring-emerald-500')
    ]"
  >
    <div class="flex items-center gap-4">
      <!-- Animated icon -->
      <div
        class="w-16 h-16 rounded-full flex items-center justify-center text-4xl"
        :class="[roleConfig[currentRole].bg, isMyTurn ? 'animate-pulse' : 'animate-float']"
      >
        {{ roleConfig[currentRole].icon }}
      </div>

      <!-- Info -->
      <div class="flex-1">
        <p
          class="font-bold text-lg"
          :class="roleConfig[currentRole].color"
        >
          {{ roleConfig[currentRole].label }}
        </p>
        <p class="text-neutral-400 text-sm">
          {{ roleConfig[currentRole].action }}
        </p>

        <!-- Your turn indicator -->
        <p
          v-if="isMyTurn"
          class="mt-1 text-xs font-semibold uppercase tracking-wider"
          :class="roleConfig[currentRole].color"
        >
          👆 C'est ton tour !
        </p>
      </div>
    </div>
  </div>
</template>
