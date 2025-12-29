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
    v-if="timeLeft > 0"
    class="text-center py-2 px-4 rounded-full inline-flex items-center gap-2"
    :class="isLow ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-gray-800 text-gray-300'"
  >
    <UIcon name="i-heroicons-clock" class="w-4 h-4" />
    <span class="font-mono font-semibold">{{ formattedTime }}</span>
  </div>
</template>
