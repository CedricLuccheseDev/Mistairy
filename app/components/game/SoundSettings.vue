<script setup lang="ts">
const { settings, toggleVoice, toggleAmbient, toggleEffects, setVoiceVolume, setAmbientVolume, setEffectsVolume } = useSoundSettings()

/* --- Emits --- */
const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30">
        <span class="text-xl">🔊</span>
        <span class="text-violet-300 font-medium">Réglages audio</span>
      </div>
    </div>

    <!-- Voice Settings -->
    <div class="p-4 rounded-2xl bg-white/5 border border-white/10">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl">🎙️</span>
          <div>
            <p class="text-white font-medium">Voix du narrateur</p>
            <p class="text-xs text-neutral-400">TTS et narration IA</p>
          </div>
        </div>
        <button
          class="w-12 h-7 rounded-full transition-colors relative"
          :class="settings.voiceEnabled ? 'bg-violet-600' : 'bg-neutral-700'"
          @click="toggleVoice()"
        >
          <span
            class="absolute top-1 w-5 h-5 rounded-full bg-white transition-transform"
            :class="settings.voiceEnabled ? 'left-6' : 'left-1'"
          />
        </button>
      </div>

      <div v-if="settings.voiceEnabled" class="space-y-2">
        <div class="flex justify-between text-sm text-neutral-400">
          <span>Volume</span>
          <span class="text-violet-400">{{ Math.round(settings.voiceVolume * 100) }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="settings.voiceVolume"
          class="w-full h-2 rounded-full bg-neutral-700 appearance-none cursor-pointer accent-violet-500"
          @input="setVoiceVolume(parseFloat(($event.target as HTMLInputElement).value))"
        >
      </div>
    </div>

    <!-- Ambient Settings -->
    <div class="p-4 rounded-2xl bg-white/5 border border-white/10">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">🌙</span>
          <div>
            <p class="text-white font-medium">Ambiance sonore</p>
            <p class="text-xs text-neutral-400">Sons de fond jour/nuit</p>
          </div>
        </div>
        <button
          class="w-12 h-7 rounded-full transition-colors relative"
          :class="settings.ambientEnabled ? 'bg-violet-600' : 'bg-neutral-700'"
          @click="toggleAmbient()"
        >
          <span
            class="absolute top-1 w-5 h-5 rounded-full bg-white transition-transform"
            :class="settings.ambientEnabled ? 'left-6' : 'left-1'"
          />
        </button>
      </div>

      <div v-if="settings.ambientEnabled" class="space-y-2">
        <div class="flex justify-between text-sm text-neutral-400">
          <span>Volume</span>
          <span class="text-violet-400">{{ Math.round(settings.ambientVolume * 100) }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="settings.ambientVolume"
          class="w-full h-2 rounded-full bg-neutral-700 appearance-none cursor-pointer accent-violet-500"
          @input="setAmbientVolume(parseFloat(($event.target as HTMLInputElement).value))"
        >
      </div>
    </div>

    <!-- Effects Settings -->
    <div class="p-4 rounded-2xl bg-white/5 border border-white/10">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">💥</span>
          <div>
            <p class="text-white font-medium">Effets sonores</p>
            <p class="text-xs text-neutral-400">Transitions et alertes</p>
          </div>
        </div>
        <button
          class="w-12 h-7 rounded-full transition-colors relative"
          :class="settings.effectsEnabled ? 'bg-violet-600' : 'bg-neutral-700'"
          @click="toggleEffects()"
        >
          <span
            class="absolute top-1 w-5 h-5 rounded-full bg-white transition-transform"
            :class="settings.effectsEnabled ? 'left-6' : 'left-1'"
          />
        </button>
      </div>

      <div v-if="settings.effectsEnabled" class="space-y-2">
        <div class="flex justify-between text-sm text-neutral-400">
          <span>Volume</span>
          <span class="text-violet-400">{{ Math.round(settings.effectsVolume * 100) }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="settings.effectsVolume"
          class="w-full h-2 rounded-full bg-neutral-700 appearance-none cursor-pointer accent-violet-500"
          @input="setEffectsVolume(parseFloat(($event.target as HTMLInputElement).value))"
        >
      </div>
    </div>

    <!-- Close Button -->
    <button
      class="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
      @click="emit('close')"
    >
      Fermer
    </button>
  </div>
</template>
