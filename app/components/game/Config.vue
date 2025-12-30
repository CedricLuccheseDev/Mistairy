<script setup lang="ts">
import type { GameSettings } from '#shared/types/database.types'
import { DEFAULT_SETTINGS } from '#shared/config/game.config'

/* --- Props --- */
const props = defineProps<{
  gameId: string
  currentSettings?: GameSettings
}>()

/* --- Emits --- */
const emit = defineEmits<{
  saved: [settings: GameSettings]
}>()

/* --- Services --- */
const toast = useToast()

/* --- States --- */
const isSaving = ref(false)
const activePreset = ref<'quick' | 'normal' | 'relaxed' | null>(null)
const settings = reactive<GameSettings>({
  night_time: props.currentSettings?.night_time ?? DEFAULT_SETTINGS.night_time,
  discussion_time: props.currentSettings?.discussion_time ?? DEFAULT_SETTINGS.discussion_time,
  vote_time: props.currentSettings?.vote_time ?? DEFAULT_SETTINGS.vote_time,
  narration_enabled: props.currentSettings?.narration_enabled ?? DEFAULT_SETTINGS.narration_enabled,
  roles: {
    seer: props.currentSettings?.roles?.seer ?? DEFAULT_SETTINGS.roles.seer,
    witch: props.currentSettings?.roles?.witch ?? DEFAULT_SETTINGS.roles.witch,
    hunter: props.currentSettings?.roles?.hunter ?? DEFAULT_SETTINGS.roles.hunter
  }
})

/* --- Time presets --- */
const presets = {
  quick: {
    night_time: 20,
    discussion_time: 60,
    vote_time: 30,
    label: 'Rapide',
    emoji: '⚡',
    description: 'Parties intenses'
  },
  normal: {
    night_time: 30,
    discussion_time: 120,
    vote_time: 60,
    label: 'Normal',
    emoji: '⏱️',
    description: 'Équilibré'
  },
  relaxed: {
    night_time: 45,
    discussion_time: 180,
    vote_time: 90,
    label: 'Tranquille',
    emoji: '🍃',
    description: 'Sans pression'
  }
}

function applyPreset(preset: 'quick' | 'normal' | 'relaxed') {
  const p = presets[preset]
  settings.night_time = p.night_time
  settings.discussion_time = p.discussion_time
  settings.vote_time = p.vote_time
  activePreset.value = preset
}

// Detect active preset on init
function detectPreset() {
  for (const [key, p] of Object.entries(presets)) {
    if (
      settings.night_time === p.night_time &&
      settings.discussion_time === p.discussion_time &&
      settings.vote_time === p.vote_time
    ) {
      activePreset.value = key as 'quick' | 'normal' | 'relaxed'
      return
    }
  }
  activePreset.value = null
}

onMounted(detectPreset)

// Clear preset when manually adjusting
watch([() => settings.night_time, () => settings.discussion_time, () => settings.vote_time], () => {
  detectPreset()
})

/* --- Roles Config --- */
const roleCards = computed(() => [
  {
    key: 'seer' as const,
    emoji: '🔮',
    name: 'Voyante',
    description: 'Voit le rôle d\'un joueur chaque nuit',
    color: 'violet'
  },
  {
    key: 'witch' as const,
    emoji: '🧪',
    name: 'Sorcière',
    description: '1 potion de vie + 1 poison',
    color: 'emerald'
  },
  {
    key: 'hunter' as const,
    emoji: '🏹',
    name: 'Chasseur',
    description: 'Emporte un joueur en mourant',
    color: 'amber'
  }
])

/* --- Methods --- */
async function saveSettings() {
  isSaving.value = true

  try {
    await $fetch('/api/game/update-settings', {
      method: 'POST',
      body: {
        gameId: props.gameId,
        settings
      }
    })

    toast.add({ title: '✅ Configuration sauvegardée', color: 'success' })
    emit('saved', { ...settings })
  }
  catch (e) {
    console.error('Failed to save settings:', e)
    toast.add({ title: 'Erreur lors de la sauvegarde', color: 'error' })
  }
  finally {
    isSaving.value = false
  }
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m${secs}s` : `${mins}min`
}

/* --- Slider progress --- */
function getSliderProgress(value: number, min: number, max: number): string {
  return `${((value - min) / (max - min)) * 100}%`
}
</script>

<template>
  <div class="space-y-6 pb-2">
    <!-- Header -->
    <div class="text-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30">
        <span class="text-xl">⚙️</span>
        <span class="text-violet-300 font-medium">Configuration de partie</span>
      </div>
    </div>

    <!-- Time Presets -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <span class="text-lg">🎮</span>
        <span class="text-sm font-semibold text-white">Mode de jeu</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="(preset, key) in presets"
          :key="key"
          class="relative p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden group"
          :class="[
            activePreset === key
              ? 'border-violet-500 bg-violet-600/20 scale-[1.02]'
              : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
          ]"
          @click="applyPreset(key)"
        >
          <!-- Glow effect when active -->
          <div
            v-if="activePreset === key"
            class="absolute inset-0 bg-gradient-to-t from-violet-600/20 to-transparent"
          />
          <div class="relative z-10">
            <div class="text-2xl mb-2 group-hover:scale-110 transition-transform">{{ preset.emoji }}</div>
            <p class="text-white text-sm font-bold">{{ preset.label }}</p>
            <p class="text-neutral-500 text-[10px] mt-0.5">{{ preset.description }}</p>
          </div>
          <!-- Active indicator -->
          <div
            v-if="activePreset === key"
            class="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-400 animate-pulse"
          />
        </button>
      </div>
    </div>

    <!-- Time Sliders -->
    <div class="space-y-5 p-4 rounded-2xl bg-white/5 border border-white/10">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-lg">⏰</span>
        <span class="text-sm font-semibold text-white">Durées</span>
        <span class="text-[10px] text-neutral-500 ml-auto">Personnalisé</span>
      </div>

      <!-- Night Time -->
      <div class="slider-container">
        <div class="flex justify-between text-sm mb-2">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-base">🌙</span>
            <span class="text-neutral-300">Nuit</span>
          </div>
          <span class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-mono font-bold">
            {{ formatTime(settings.night_time) }}
          </span>
        </div>
        <div class="slider-track bg-indigo-950/50">
          <div
            class="slider-fill bg-gradient-to-r from-indigo-600 to-indigo-400"
            :style="{ width: getSliderProgress(settings.night_time, 15, 60) }"
          />
          <input
            v-model.number="settings.night_time"
            type="range"
            min="15"
            max="60"
            step="5"
            class="slider-input"
          >
        </div>
      </div>

      <!-- Discussion Time -->
      <div class="slider-container">
        <div class="flex justify-between text-sm mb-2">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-base">💬</span>
            <span class="text-neutral-300">Discussion</span>
          </div>
          <span class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-mono font-bold">
            {{ formatTime(settings.discussion_time) }}
          </span>
        </div>
        <div class="slider-track bg-amber-950/50">
          <div
            class="slider-fill bg-gradient-to-r from-amber-600 to-amber-400"
            :style="{ width: getSliderProgress(settings.discussion_time, 30, 300) }"
          />
          <input
            v-model.number="settings.discussion_time"
            type="range"
            min="30"
            max="300"
            step="15"
            class="slider-input"
          >
        </div>
      </div>

      <!-- Vote Time -->
      <div class="slider-container">
        <div class="flex justify-between text-sm mb-2">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-base">🗳️</span>
            <span class="text-neutral-300">Vote</span>
          </div>
          <span class="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-sm font-mono font-bold">
            {{ formatTime(settings.vote_time) }}
          </span>
        </div>
        <div class="slider-track bg-orange-950/50">
          <div
            class="slider-fill bg-gradient-to-r from-orange-600 to-orange-400"
            :style="{ width: getSliderProgress(settings.vote_time, 20, 120) }"
          />
          <input
            v-model.number="settings.vote_time"
            type="range"
            min="20"
            max="120"
            step="10"
            class="slider-input"
          >
        </div>
      </div>
    </div>

    <!-- Roles -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <span class="text-lg">🎭</span>
        <span class="text-sm font-semibold text-white">Rôles spéciaux</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="role in roleCards"
          :key="role.key"
          class="relative p-3 rounded-2xl border-2 transition-all duration-300 text-center group"
          :class="[
            settings.roles[role.key]
              ? `border-${role.color}-500/50 bg-${role.color}-600/20`
              : 'border-white/10 bg-white/5 opacity-50'
          ]"
          @click="settings.roles[role.key] = !settings.roles[role.key]"
        >
          <div
            class="text-3xl mb-2 transition-all duration-300"
            :class="settings.roles[role.key] ? 'grayscale-0 scale-110' : 'grayscale'"
          >
            {{ role.emoji }}
          </div>
          <p class="text-white text-xs font-bold">{{ role.name }}</p>
          <p class="text-neutral-500 text-[9px] mt-1 leading-tight">{{ role.description }}</p>

          <!-- Check mark -->
          <div
            class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all duration-300"
            :class="settings.roles[role.key] ? 'bg-green-500 scale-100' : 'bg-neutral-700 scale-0'"
          >
            ✓
          </div>
        </button>
      </div>
    </div>

    <!-- Narration Toggle -->
    <div
      class="relative p-4 rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer"
      :class="settings.narration_enabled
        ? 'border-violet-500/50 bg-gradient-to-br from-violet-600/20 to-purple-900/20'
        : 'border-white/10 bg-white/5'"
      @click="settings.narration_enabled = !settings.narration_enabled"
    >
      <!-- Animated background when enabled -->
      <div
        v-if="settings.narration_enabled"
        class="absolute inset-0 overflow-hidden"
      >
        <div class="absolute -top-10 -left-10 w-40 h-40 bg-violet-500/10 rounded-full blur-2xl animate-pulse" />
        <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl animate-pulse" style="animation-delay: 0.5s" />
      </div>

      <div class="relative z-10 flex items-center gap-4">
        <div
          class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all duration-300"
          :class="settings.narration_enabled ? 'bg-violet-500/30' : 'bg-white/10'"
        >
          🎙️
        </div>
        <div class="flex-1">
          <p class="text-white font-bold">Narration IA</p>
          <p class="text-neutral-400 text-xs">Une voix guide les joueurs avec des histoires uniques</p>
        </div>
        <!-- Toggle switch -->
        <div
          class="relative w-14 h-8 rounded-full transition-all duration-300"
          :class="settings.narration_enabled ? 'bg-violet-600' : 'bg-neutral-700'"
        >
          <div
            class="absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center text-xs"
            :class="settings.narration_enabled ? 'left-7' : 'left-1'"
          >
            {{ settings.narration_enabled ? '🔊' : '🔇' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <button
      class="w-full p-4 rounded-2xl font-bold text-lg transition-all duration-300 relative overflow-hidden group disabled:opacity-50"
      :class="isSaving ? 'bg-neutral-700' : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500'"
      :disabled="isSaving"
      @click="saveSettings"
    >
      <!-- Shine effect -->
      <div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <span class="relative z-10 flex items-center justify-center gap-2">
        <span v-if="isSaving" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span v-else>💾</span>
        <span>{{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
/* Slider styles */
.slider-container {
  position: relative;
}

.slider-track {
  position: relative;
  height: 0.75rem;
  border-radius: 9999px;
  overflow: hidden;
}

.slider-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 9999px;
  transition: all 150ms;
}

.slider-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
}

/* Dynamic colors for roles */
.border-violet-500\/50 {
  border-color: rgba(139, 92, 246, 0.5);
}
.bg-violet-600\/20 {
  background-color: rgba(124, 58, 237, 0.2);
}
.border-emerald-500\/50 {
  border-color: rgba(16, 185, 129, 0.5);
}
.bg-emerald-600\/20 {
  background-color: rgba(5, 150, 105, 0.2);
}
.border-amber-500\/50 {
  border-color: rgba(245, 158, 11, 0.5);
}
.bg-amber-600\/20 {
  background-color: rgba(217, 119, 6, 0.2);
}
</style>
