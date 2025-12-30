<script setup lang="ts">
/* --- Props --- */
const props = defineProps<{
  endAt: string | null
}>()

/* --- States --- */
const timeLeft = ref(0)
let interval: ReturnType<typeof setInterval> | null = null

/* --- Computed --- */
const formattedTime = computed(() => {
  if (timeLeft.value <= 0) return '0:00'
  const minutes = Math.floor(timeLeft.value / 60)
  const seconds = timeLeft.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const isLow = computed(() => timeLeft.value <= 10 && timeLeft.value > 0)

/* --- Methods --- */
function updateTimer() {
  if (!props.endAt) {
    timeLeft.value = 0
    return
  }

  const end = new Date(props.endAt).getTime()
  const now = Date.now()
  const diff = Math.max(0, Math.floor((end - now) / 1000))
  timeLeft.value = diff
}

/* --- Lifecycle --- */
onMounted(() => {
  updateTimer()
  interval = setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

/* --- Watchers --- */
watch(() => props.endAt, () => {
  updateTimer()
})
</script>

<template>
  <div
    class="text-center py-2 px-4 rounded-full inline-flex items-center gap-2 transition-all duration-300"
    :class="[
      timeLeft <= 0
        ? 'bg-neutral-800/50 text-neutral-500 border border-neutral-700/30'
        : isLow
          ? 'bg-red-500/30 text-red-400 border border-red-500/50 animate-heartbeat'
          : 'bg-neutral-800/80 text-neutral-300 border border-neutral-700/50'
    ]"
  >
    <UIcon name="i-heroicons-clock" class="w-4 h-4" :class="isLow && 'animate-pulse'" />
    <span class="font-mono font-bold text-lg">{{ formattedTime }}</span>
  </div>
</template>
