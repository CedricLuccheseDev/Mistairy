<script setup lang="ts">
import type { Player } from '#shared/types/game'

/* --- Props --- */
const props = defineProps<{
  player: Player
  selected?: boolean
  disabled?: boolean
  showWerewolf?: boolean
  actionColor?: 'red' | 'violet' | 'green' | 'amber'
}>()

/* --- Emits --- */
defineEmits<{
  select: [player: Player]
}>()

/* --- Computed --- */
const isWerewolf = computed(() => props.player.role === 'werewolf')

const cardClasses = computed(() => {
  const base = 'rounded-xl border backdrop-blur-sm p-3 flex items-center gap-3 transition-all duration-200'

  if (props.disabled) {
    return `${base} opacity-40 cursor-not-allowed border-neutral-700/30 bg-neutral-900/30`
  }

  if (props.selected) {
    const colorMap = {
      red: 'border-red-500 bg-red-950/50 ring-2 ring-red-500/50',
      violet: 'border-violet-500 bg-violet-950/50 ring-2 ring-violet-500/50',
      green: 'border-green-500 bg-green-950/50 ring-2 ring-green-500/50',
      amber: 'border-amber-500 bg-amber-950/50 ring-2 ring-amber-500/50'
    }
    return `${base} ${colorMap[props.actionColor || 'violet']} scale-[1.02]`
  }

  return `${base} border-neutral-700/50 bg-neutral-900/50 hover:border-neutral-600 hover:bg-neutral-800/50 active:scale-[0.98]`
})

const avatarClasses = computed(() => {
  if (props.showWerewolf && isWerewolf.value) {
    return 'bg-red-900/50 text-red-400'
  }
  if (props.selected) {
    const colorMap = {
      red: 'bg-red-900/50',
      violet: 'bg-violet-900/50',
      green: 'bg-green-900/50',
      amber: 'bg-amber-900/50'
    }
    return colorMap[props.actionColor || 'violet']
  }
  return 'bg-neutral-800'
})
</script>

<template>
  <button
    :class="cardClasses"
    :disabled="disabled"
    @click="!disabled && $emit('select', player)"
  >
    <!-- Avatar -->
    <div
      class="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors"
      :class="avatarClasses"
    >
      <span v-if="showWerewolf && isWerewolf">🐺</span>
      <span v-else-if="!player.is_alive">💀</span>
      <span v-else>{{ player.name.charAt(0).toUpperCase() }}</span>
    </div>

    <!-- Name -->
    <div class="flex-1 text-left">
      <p
        class="font-medium"
        :class="[
          selected ? 'text-white' : 'text-neutral-200',
          !player.is_alive && 'line-through text-neutral-500'
        ]"
      >
        {{ player.name }}
      </p>
      <p v-if="showWerewolf && isWerewolf" class="text-xs text-red-400">
        Loup-Garou
      </p>
    </div>

    <!-- Selection indicator -->
    <div
      v-if="selected"
      class="w-6 h-6 rounded-full flex items-center justify-center"
      :class="{
        'bg-red-500': actionColor === 'red',
        'bg-violet-500': actionColor === 'violet' || !actionColor,
        'bg-green-500': actionColor === 'green',
        'bg-amber-500': actionColor === 'amber'
      }"
    >
      <UIcon name="i-heroicons-check" class="w-4 h-4 text-white" />
    </div>
  </button>
</template>
