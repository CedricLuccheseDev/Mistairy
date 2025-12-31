// Sound settings persisted per client in localStorage
interface SoundSettings {
  voiceEnabled: boolean
  voiceVolume: number
  ambientEnabled: boolean
  ambientVolume: number
  effectsEnabled: boolean
  effectsVolume: number
}

const STORAGE_KEY = 'loupagrou-sound-settings'
const INITIALIZED_KEY = 'loupagrou-sound-initialized'

const DEFAULT_SETTINGS: SoundSettings = {
  voiceEnabled: true,
  voiceVolume: 1,
  ambientEnabled: true,
  ambientVolume: 0.3,
  effectsEnabled: true,
  effectsVolume: 0.5
}

// Non-host players have sounds muted by default
const MUTED_SETTINGS: SoundSettings = {
  voiceEnabled: false,
  voiceVolume: 1,
  ambientEnabled: false,
  ambientVolume: 0.3,
  effectsEnabled: false,
  effectsVolume: 0.5
}

export function useSoundSettings() {
  const settings = useState<SoundSettings>('soundSettings', () => MUTED_SETTINGS)

  // Load settings from localStorage on mount
  function loadSettings(): void {
    if (import.meta.client) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<SoundSettings>
          settings.value = { ...MUTED_SETTINGS, ...parsed }
        }
      }
      catch {
        // Ignore parse errors, use defaults
      }
    }
  }

  // Initialize settings for host (enable sounds by default)
  function initForHost(): void {
    if (import.meta.client) {
      // Only initialize once per session
      const initialized = sessionStorage.getItem(INITIALIZED_KEY)
      if (initialized) return

      sessionStorage.setItem(INITIALIZED_KEY, 'true')

      // Check if user has custom settings
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        // No custom settings, enable sounds for host
        settings.value = { ...DEFAULT_SETTINGS }
        saveSettings()
      }
    }
  }

  // Save settings to localStorage
  function saveSettings(): void {
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
      }
      catch {
        // Ignore storage errors
      }
    }
  }

  // Individual setting toggles
  function toggleVoice(): void {
    settings.value.voiceEnabled = !settings.value.voiceEnabled
    saveSettings()
  }

  function toggleAmbient(): void {
    settings.value.ambientEnabled = !settings.value.ambientEnabled
    saveSettings()
  }

  function toggleEffects(): void {
    settings.value.effectsEnabled = !settings.value.effectsEnabled
    saveSettings()
  }

  function setVoiceVolume(volume: number): void {
    settings.value.voiceVolume = Math.max(0, Math.min(1, volume))
    saveSettings()
  }

  function setAmbientVolume(volume: number): void {
    settings.value.ambientVolume = Math.max(0, Math.min(1, volume))
    saveSettings()
  }

  function setEffectsVolume(volume: number): void {
    settings.value.effectsVolume = Math.max(0, Math.min(1, volume))
    saveSettings()
  }

  // Mute all sounds
  function muteAll(): void {
    settings.value.voiceEnabled = false
    settings.value.ambientEnabled = false
    settings.value.effectsEnabled = false
    saveSettings()
  }

  // Unmute all sounds
  function unmuteAll(): void {
    settings.value.voiceEnabled = true
    settings.value.ambientEnabled = true
    settings.value.effectsEnabled = true
    saveSettings()
  }

  // Reset to defaults
  function resetToDefaults(): void {
    settings.value = { ...DEFAULT_SETTINGS }
    saveSettings()
  }

  // Load on client side
  onMounted(() => {
    loadSettings()
  })

  return {
    settings: readonly(settings),
    // Toggles
    toggleVoice,
    toggleAmbient,
    toggleEffects,
    // Volume setters
    setVoiceVolume,
    setAmbientVolume,
    setEffectsVolume,
    // Bulk actions
    muteAll,
    unmuteAll,
    resetToDefaults,
    // Manual save/load
    saveSettings,
    loadSettings,
    // Host initialization
    initForHost
  }
}
