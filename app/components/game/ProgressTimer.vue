<script setup lang="ts">
/* --- Props --- */
const props = defineProps<{
  endAt: string | null
  totalDuration?: number
  phaseColor?: 'indigo' | 'amber' | 'orange' | 'red'
}>()

/* --- States --- */
const timeLeft = ref(0)
const totalTime = ref(props.totalDuration || 60)
const initialized = ref(false)
let interval: ReturnType<typeof setInterval> | null = null

/* --- Computed --- */
const progress = computed(() => {
  if (totalTime.value <= 0) return 0
  return Math.max(0, Math.min(100, (timeLeft.value / totalTime.value) * 100))
})

const formattedTime = computed(() => {
  if (timeLeft.value <= 0) return '0:00'
  const minutes = Math.floor(timeLeft.value / 60)
  const seconds = timeLeft.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const isUrgent = computed(() => timeLeft.value <= 10 && timeLeft.value > 0)
const isCritical = computed(() => timeLeft.value <= 3 && timeLeft.value > 0)

const barColor = computed(() => {
  if (isCritical.value) return 'bg-red-500'
  if (isUrgent.value) return 'bg-orange-500'

  const colors = {
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  }
  return colors[props.phaseColor || 'indigo']
})

const bgColor = computed(() => {
  if (isCritical.value) return 'bg-red-950/50'
  if (isUrgent.value) return 'bg-orange-950/50'

  const colors = {
    indigo: 'bg-indigo-950/30',
    amber: 'bg-amber-950/30',
    orange: 'bg-orange-950/30',
    red: 'bg-red-950/30'
  }
  return colors[props.phaseColor || 'indigo']
})

/* --- Methods --- */
function updateTimer() {
  if (!props.endAt) {
    // No timer set yet - show full bar in waiting state
    if (!initialized.value) {
      totalTime.value = props.totalDuration || 60
      timeLeft.value = totalTime.value
    }
    return
  }

  const end = new Date(props.endAt).getTime()
  const now = Date.now()
  const diff = Math.max(0, Math.floor((end - now) / 1000))

  // Initialize totalTime when timer starts
  if (!initialized.value && diff > 0) {
    totalTime.value = props.totalDuration || diff
    initialized.value = true
  }

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
watch(() => props.endAt, (newVal, oldVal) => {
  // Reset when phase changes (new timer)
  if (newVal !== oldVal) {
    initialized.value = false
  }
  updateTimer()
})

watch(() => props.totalDuration, () => {
  if (!initialized.value) {
    totalTime.value = props.totalDuration || 60
    timeLeft.value = totalTime.value
  }
})
</script>

<template>
  <div class="w-full">
    <!-- Timer bar container -->
    <div
      class="relative h-8 rounded-full overflow-hidden transition-all duration-300"
      :class="[
        bgColor,
        isCritical && 'animate-pulse ring-2 ring-red-500'
      ]"
    >
      <!-- Progress bar -->
      <div
        class="absolute inset-y-0 left-0 transition-all duration-1000 ease-linear rounded-full"
        :class="barColor"
        :style="{ width: `${progress}%` }"
      />

      <!-- Time text -->
      <div class="absolute inset-0 flex items-center justify-center">
        <span
          class="font-mono font-bold text-sm"
          :class="[
            isCritical ? 'text-red-100 animate-pulse' : 'text-white',
            isUrgent && !isCritical && 'text-orange-100'
          ]"
        >
          {{ formattedTime }}
        </span>
      </div>
    </div>

    <!-- Critical alert -->
    <Transition name="fade">
      <div
        v-if="isCritical"
        class="mt-2 text-center animate-pulse"
      >
        <span class="text-xs font-medium text-red-400 uppercase tracking-wider">
          ⚠️ Temps presque écoulé !
        </span>
      </div>
    </Transition>
  </div>
</template>
