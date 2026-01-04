<script setup lang="ts">
import type { GameSettings } from '#shared/types/database.types'
import { DEFAULT_SETTINGS, MIN_PLAYERS, MAX_PLAYERS } from '#shared/config/game.config'
import * as gameApi from '~/services/gameApi'

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
const activeTab = ref<'mode' | 'time' | 'roles'>('mode')
const activePreset = ref<'quick' | 'normal' | 'relaxed' | null>(null)

const settings = reactive<GameSettings>({
  night_time: props.currentSettings?.night_time ?? DEFAULT_SETTINGS.night_time,
  discussion_time: props.currentSettings?.discussion_time ?? DEFAULT_SETTINGS.discussion_time,
  vote_time: props.currentSettings?.vote_time ?? DEFAULT_SETTINGS.vote_time,
  max_players: props.currentSettings?.max_players ?? DEFAULT_SETTINGS.max_players,
  narration_enabled: props.currentSettings?.narration_enabled ?? DEFAULT_SETTINGS.narration_enabled,
  roles: {
    seer: props.currentSettings?.roles?.seer ?? DEFAULT_SETTINGS.roles.seer,
    witch: props.currentSettings?.roles?.witch ?? DEFAULT_SETTINGS.roles.witch,
    hunter: props.currentSettings?.roles?.hunter ?? DEFAULT_SETTINGS.roles.hunter
  }
})

/* --- Tabs --- */
const tabs = [
  { key: 'mode' as const, label: 'Mode', icon: '🎮' },
  { key: 'time' as const, label: 'Temps', icon: '⏱️' },
  { key: 'roles' as const, label: 'Roles', icon: '🎭' }
]

/* --- Time presets --- */
const presets = {
  quick: { night_time: 20, discussion_time: 60, vote_time: 30, label: 'Rapide', emoji: '⚡', desc: 'Action intense' },
  normal: { night_time: 30, discussion_time: 120, vote_time: 60, label: 'Normal', emoji: '⏱️', desc: 'Equilibre parfait' },
  relaxed: { night_time: 45, discussion_time: 180, vote_time: 90, label: 'Tranquille', emoji: '🍃', desc: 'Prendre son temps' }
}

/* --- Roles --- */
const roleCards = [
  { key: 'seer' as const, emoji: '🔮', name: 'Voyante', desc: 'Voir un role par nuit', color: 'violet' },
  { key: 'witch' as const, emoji: '🧪', name: 'Sorciere', desc: 'Sauver ou tuer', color: 'emerald' },
  { key: 'hunter' as const, emoji: '🏹', name: 'Chasseur', desc: 'Vengeance fatale', color: 'amber' }
]

/* --- Methods --- */
function applyPreset(preset: 'quick' | 'normal' | 'relaxed') {
  const p = presets[preset]
  settings.night_time = p.night_time
  settings.discussion_time = p.discussion_time
  settings.vote_time = p.vote_time
  activePreset.value = preset
}

function detectPreset() {
  for (const [key, p] of Object.entries(presets)) {
    if (settings.night_time === p.night_time && settings.discussion_time === p.discussion_time && settings.vote_time === p.vote_time) {
      activePreset.value = key as 'quick' | 'normal' | 'relaxed'
      return
    }
  }
  activePreset.value = null
}

async function saveSettings() {
  isSaving.value = true
  try {
    await gameApi.updateSettings(props.gameId, settings)
    toast.add({ title: 'Configuration sauvegardee', color: 'success' })
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

function getProgress(value: number, min: number, max: number): string {
  return `${((value - min) / (max - min)) * 100}%`
}

/* --- Lifecycle --- */
onMounted(detectPreset)
watch([() => settings.night_time, () => settings.discussion_time, () => settings.vote_time], detectPreset)
</script>

<template>
  <div class="flex flex-col h-full max-h-[85vh]">
    <!-- Tabs -->
    <div class="flex gap-1 p-1 bg-white/5 rounded-xl mb-4">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === tab.key
          ? 'bg-violet-600 text-white shadow-lg'
          : 'text-neutral-400 hover:text-white hover:bg-white/5'"
        @click="activeTab = tab.key"
      >
        <span>{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-y-auto px-1 pb-2">
      <!-- MODE TAB -->
      <div v-show="activeTab === 'mode'" class="space-y-4">
        <!-- Presets -->
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="(preset, key) in presets"
            :key="key"
            class="relative p-4 rounded-xl border-2 transition-all group"
            :class="activePreset === key
              ? 'border-violet-500 bg-violet-600/20 scale-[1.02]'
              : 'border-white/10 bg-white/5 hover:border-white/20'"
            @click="applyPreset(key)"
          >
            <div class="text-2xl mb-1 group-hover:scale-110 transition-transform">{{ preset.emoji }}</div>
            <p class="text-white text-sm font-bold">{{ preset.label }}</p>
            <p class="text-neutral-500 text-[10px]">{{ preset.desc }}</p>
            <div v-if="activePreset === key" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          </button>
        </div>

        <!-- Narration -->
        <div
          class="p-4 rounded-xl border-2 transition-all cursor-pointer"
          :class="settings.narration_enabled
            ? 'border-violet-500/50 bg-violet-600/10'
            : 'border-white/10 bg-white/5'"
          @click="settings.narration_enabled = !settings.narration_enabled"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              :class="settings.narration_enabled ? 'bg-violet-500/30' : 'bg-white/10'"
            >
              🎙️
            </div>
            <div class="flex-1">
              <p class="text-white font-bold">Narration IA</p>
              <p class="text-neutral-500 text-xs">Voix qui guide les joueurs</p>
            </div>
            <div
              class="w-12 h-7 rounded-full transition-all"
              :class="settings.narration_enabled ? 'bg-violet-600' : 'bg-neutral-700'"
            >
              <div
                class="w-5 h-5 mt-1 rounded-full bg-white shadow transition-all flex items-center justify-center text-[10px]"
                :class="settings.narration_enabled ? 'ml-6' : 'ml-1'"
              >
                {{ settings.narration_enabled ? '🔊' : '🔇' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Max Players -->
        <div class="p-4 rounded-xl bg-white/5 border border-white/10">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-lg">👥</span>
              <span class="text-white text-sm font-medium">Joueurs max</span>
            </div>
            <span class="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-sm font-bold">
              {{ settings.max_players }}
            </span>
          </div>
          <div class="slider-track bg-violet-950/50">
            <div class="slider-fill bg-violet-500" :style="{ width: getProgress(settings.max_players, MIN_PLAYERS, MAX_PLAYERS) }" />
            <input v-model.number="settings.max_players" type="range" :min="MIN_PLAYERS" :max="MAX_PLAYERS" step="1" class="slider-input">
          </div>
          <div class="flex justify-between text-xs text-neutral-500 mt-1">
            <span>{{ MIN_PLAYERS }}</span>
            <span>{{ MAX_PLAYERS }}</span>
          </div>
        </div>
      </div>

      <!-- TIME TAB -->
      <div v-show="activeTab === 'time'" class="space-y-4">
        <p class="text-neutral-500 text-xs text-center mb-2">Ajuste les durees ou choisis un mode dans l'onglet Mode</p>

        <!-- Night -->
        <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center">🌙</span>
              <span class="text-white text-sm font-medium">Nuit</span>
            </div>
            <span class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-mono font-bold">
              {{ formatTime(settings.night_time) }}
            </span>
          </div>
          <div class="slider-track bg-indigo-950/50">
            <div class="slider-fill bg-indigo-500" :style="{ width: getProgress(settings.night_time, 15, 60) }" />
            <input v-model.number="settings.night_time" type="range" min="15" max="60" step="5" class="slider-input">
          </div>
        </div>

        <!-- Discussion -->
        <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-amber-500/30 flex items-center justify-center">💬</span>
              <span class="text-white text-sm font-medium">Discussion</span>
            </div>
            <span class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-mono font-bold">
              {{ formatTime(settings.discussion_time) }}
            </span>
          </div>
          <div class="slider-track bg-amber-950/50">
            <div class="slider-fill bg-amber-500" :style="{ width: getProgress(settings.discussion_time, 30, 300) }" />
            <input v-model.number="settings.discussion_time" type="range" min="30" max="300" step="15" class="slider-input">
          </div>
        </div>

        <!-- Vote -->
        <div class="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-orange-500/30 flex items-center justify-center">🗳️</span>
              <span class="text-white text-sm font-medium">Vote</span>
            </div>
            <span class="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-sm font-mono font-bold">
              {{ formatTime(settings.vote_time) }}
            </span>
          </div>
          <div class="slider-track bg-orange-950/50">
            <div class="slider-fill bg-orange-500" :style="{ width: getProgress(settings.vote_time, 20, 120) }" />
            <input v-model.number="settings.vote_time" type="range" min="20" max="120" step="10" class="slider-input">
          </div>
        </div>

        <!-- Quick summary -->
        <div class="p-3 rounded-xl bg-white/5 border border-white/10">
          <div class="flex items-center justify-around text-center">
            <div>
              <p class="text-neutral-500 text-[10px]">Nuit</p>
              <p class="text-white text-sm font-bold">{{ formatTime(settings.night_time) }}</p>
            </div>
            <div class="w-px h-8 bg-white/10" />
            <div>
              <p class="text-neutral-500 text-[10px]">Discussion</p>
              <p class="text-white text-sm font-bold">{{ formatTime(settings.discussion_time) }}</p>
            </div>
            <div class="w-px h-8 bg-white/10" />
            <div>
              <p class="text-neutral-500 text-[10px]">Vote</p>
              <p class="text-white text-sm font-bold">{{ formatTime(settings.vote_time) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ROLES TAB -->
      <div v-show="activeTab === 'roles'" class="space-y-4">
        <p class="text-neutral-500 text-xs text-center mb-2">Selectionne les roles speciaux a inclure</p>

        <div class="space-y-2">
          <button
            v-for="role in roleCards"
            :key="role.key"
            class="w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4"
            :class="settings.roles[role.key]
              ? `border-${role.color}-500/50 bg-${role.color}-600/10`
              : 'border-white/10 bg-white/5 opacity-60'"
            @click="settings.roles[role.key] = !settings.roles[role.key]"
          >
            <div
              class="w-14 h-14 rounded-xl flex items-center justify-center text-3xl transition-all"
              :class="settings.roles[role.key] ? 'grayscale-0' : 'grayscale'"
            >
              {{ role.emoji }}
            </div>
            <div class="flex-1 text-left">
              <p class="text-white font-bold">{{ role.name }}</p>
              <p class="text-neutral-500 text-xs">{{ role.desc }}</p>
            </div>
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all"
              :class="settings.roles[role.key] ? 'bg-green-500' : 'bg-neutral-700'"
            >
              {{ settings.roles[role.key] ? '✓' : '' }}
            </div>
          </button>
        </div>

        <!-- Roles summary -->
        <div class="p-3 rounded-xl bg-white/5 border border-white/10">
          <p class="text-neutral-500 text-xs mb-2">Roles actifs</p>
          <div class="flex gap-2 flex-wrap">
            <span class="px-2 py-1 rounded-full bg-red-500/20 text-red-300 text-xs">🐺 Loups-Garous</span>
            <span class="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs">👤 Villageois</span>
            <span v-if="settings.roles.seer" class="px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs">🔮 Voyante</span>
            <span v-if="settings.roles.witch" class="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">🧪 Sorciere</span>
            <span v-if="settings.roles.hunter" class="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs">🏹 Chasseur</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Button (fixed at bottom) -->
    <div class="pt-3 border-t border-white/10">
      <button
        class="w-full p-3 rounded-xl font-bold transition-all relative overflow-hidden group disabled:opacity-50"
        :class="isSaving ? 'bg-neutral-700' : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500'"
        :disabled="isSaving"
        @click="saveSettings"
      >
        <div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <span class="relative flex items-center justify-center gap-2">
          <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span v-else>💾</span>
          <span>{{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.slider-track {
  position: relative;
  height: 0.5rem;
  border-radius: 9999px;
  overflow: hidden;
}

.slider-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 9999px;
  transition: width 150ms;
}

.slider-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

/* Dynamic role colors */
.border-violet-500\/50 { border-color: rgba(139, 92, 246, 0.5); }
.bg-violet-600\/10 { background-color: rgba(124, 58, 237, 0.1); }
.border-emerald-500\/50 { border-color: rgba(16, 185, 129, 0.5); }
.bg-emerald-600\/10 { background-color: rgba(5, 150, 105, 0.1); }
.border-amber-500\/50 { border-color: rgba(245, 158, 11, 0.5); }
.bg-amber-600\/10 { background-color: rgba(217, 119, 6, 0.1); }
</style>
