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

const strokeColor = computed(() => {
  if (isCritical.value) return '#ef4444'
  if (isUrgent.value) return '#f97316'

  const colors = {
    indigo: '#6366f1',
    amber: '#f59e0b',
    orange: '#f97316',
    red: '#ef4444'
  }
  return colors[props.phaseColor || 'indigo']
})

/* --- Methods --- */
function updateTimer() {
  if (!props.endAt) {
    if (!initialized.value) {
      totalTime.value = props.totalDuration || 60
      timeLeft.value = totalTime.value
    }
    return
  }

  const end = new Date(props.endAt).getTime()
  const now = Date.now()
  const diff = Math.max(0, Math.floor((end - now) / 1000))

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
    <!-- Progress bar container -->
    <div
      class="relative h-7 rounded-full overflow-hidden backdrop-blur-sm border transition-all duration-300"
      :class="[
        isCritical ? 'bg-red-950/50 border-red-500/50' : 'bg-white/5 border-white/10'
      ]"
    >
      <!-- Glow effect behind progress -->
      <div
        class="absolute inset-y-0 left-0 rounded-full blur-sm transition-all duration-1000 ease-linear"
        :style="{
          width: `${progress}%`,
          backgroundColor: strokeColor,
          opacity: 0.3
        }"
      />

      <!-- Progress bar -->
      <div
        class="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear"
        :style="{
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${strokeColor}dd, ${strokeColor})`
        }"
      />

      <!-- Time text centered -->
      <div class="absolute inset-0 flex items-center justify-center">
        <span
          class="font-mono font-bold text-xs tabular-nums drop-shadow-sm"
          :class="[
            isCritical ? 'text-red-100' : 'text-white'
          ]"
        >
          {{ formattedTime }}
        </span>
      </div>

      <!-- Shine effect -->
      <div
        class="absolute inset-y-0 left-0 w-full rounded-full opacity-20"
        style="background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%)"
      />
    </div>
  </div>
</template>
