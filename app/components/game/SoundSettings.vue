<script setup lang="ts">
const { settings, muteAll, unmuteAll } = useSoundSettings()

/* --- Emits --- */
const emit = defineEmits<{
  close: []
}>()

/* --- Computed --- */
const isMuted = computed(() =>
  !settings.value.voiceEnabled && !settings.value.ambientEnabled && !settings.value.effectsEnabled
)

/* --- Methods --- */
function toggleMute() {
  if (isMuted.value) {
    unmuteAll()
  }
  else {
    muteAll()
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30">
        <span class="text-xl">{{ isMuted ? '🔇' : '🔊' }}</span>
        <span class="text-violet-300 font-medium">Audio</span>
      </div>
    </div>

    <!-- Mute Toggle -->
    <div class="p-6 rounded-2xl bg-white/5 border border-white/10">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all"
            :class="isMuted ? 'bg-neutral-800' : 'bg-violet-500/20'"
          >
            {{ isMuted ? '🔇' : '🔊' }}
          </div>
          <div>
            <p class="text-white font-bold text-lg">{{ isMuted ? 'Son désactivé' : 'Son activé' }}</p>
            <p class="text-neutral-400 text-sm">Voix, musique et effets</p>
          </div>
        </div>

        <button
          class="w-16 h-9 rounded-full transition-colors relative"
          :class="!isMuted ? 'bg-violet-600' : 'bg-neutral-700'"
          @click="toggleMute"
        >
          <span
            class="absolute top-1.5 w-6 h-6 rounded-full bg-white transition-transform shadow-lg"
            :class="!isMuted ? 'left-8' : 'left-1.5'"
          />
        </button>
      </div>
    </div>

    <!-- Info -->
    <p class="text-center text-neutral-500 text-sm">
      {{ isMuted ? 'Active le son pour entendre le narrateur' : 'Le narrateur parlera pendant la partie' }}
    </p>

    <!-- Close Button -->
    <button
      class="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
      @click="emit('close')"
    >
      Fermer
    </button>
  </div>
</template>
