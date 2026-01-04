/**
 * Narrator Composable
 * Handles TTS, AI narration, and ambient sounds
 */

import type {
  NarrationContext,
  NarrationData,
  BatchContext,
  BatchResponse,
  TTSResponse,
  VoiceType,
  AmbientSound
} from './narrator/types'
import {
  getDefaultMessage,
  getVoiceTypeForContext,
  LEGACY_MESSAGES
} from './narrator/messages.config'
import { AMBIENT_SOUNDS } from './narrator/ambient'
import { stripSSML, findBestFrenchVoice } from './narrator/tts'

// Re-export stripSSML for use in components
export { stripSSML } from './narrator/tts'

export function useNarrator() {
  /* ═══════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════ */
  const isSpeaking = ref(false)
  const isSupported = ref(false)
  const isGenerating = ref(false)
  const selectedVoice = ref<SpeechSynthesisVoice | null>(null)
  const voicesLoaded = ref(false)
  const useCloudTTS = ref(true) // Try cloud TTS first, fallback to browser
  const currentAudio = ref<HTMLAudioElement | null>(null)
  const ambientAudio = ref<HTMLAudioElement | null>(null)

  // Get sound settings from composable
  const { settings: soundSettings } = useSoundSettings()

  /* ═══════════════════════════════════════════
     BROWSER TTS SETUP
     ═══════════════════════════════════════════ */

  function initVoices() {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      selectedVoice.value = findBestFrenchVoice()
      voicesLoaded.value = true
    }
  }

  onMounted(() => {
    isSupported.value = 'speechSynthesis' in window

    if (isSupported.value) {
      initVoices()
      window.speechSynthesis.onvoiceschanged = initVoices
    }
  })

  /* ═══════════════════════════════════════════
     CLOUD TTS
     ═══════════════════════════════════════════ */

  async function speakWithCloudTTS(text: string, voiceType: VoiceType = 'story'): Promise<boolean> {
    try {
      // Voice configuration based on type
      // 'story': Deep male voice for atmospheric narration (like Papi Grenier)
      // 'event': Female voice for game announcements
      const voiceConfig = voiceType === 'story'
        ? { voice: 'male' as const, speakingRate: 0.85, pitch: -4.0 } // Deep, slow, dramatic
        : { voice: 'female' as const, speakingRate: 1.0, pitch: 0 } // Clear, neutral

      const response = await $fetch<TTSResponse>('/api/tts/speak', {
        method: 'POST',
        body: { text, ...voiceConfig }
      })

      if (!response.success || response.useFallback || !response.audio) {
        return false
      }

      // Play the audio
      return new Promise((resolve) => {
        const audio = new Audio(`data:${response.contentType};base64,${response.audio}`)
        currentAudio.value = audio

        audio.onended = () => {
          isSpeaking.value = false
          currentAudio.value = null
          resolve(true)
        }

        audio.onerror = () => {
          isSpeaking.value = false
          currentAudio.value = null
          resolve(false)
        }

        isSpeaking.value = true
        audio.play().catch(() => {
          isSpeaking.value = false
          resolve(false)
        })
      })
    }
    catch {
      return false
    }
  }

  /* ═══════════════════════════════════════════
     BROWSER TTS (FALLBACK)
     ═══════════════════════════════════════════ */

  function speakWithBrowserTTS(text: string, options?: {
    rate?: number
    pitch?: number
    volume?: number
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isSupported.value) {
        console.warn('Speech synthesis not supported')
        resolve()
        return
      }

      window.speechSynthesis.cancel()

      // Strip SSML tags for browser TTS (it doesn't understand SSML)
      const cleanText = stripSSML(text)
      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = 'fr-FR'
      utterance.rate = options?.rate ?? 0.85
      utterance.pitch = options?.pitch ?? 0.95
      utterance.volume = options?.volume ?? 1

      if (selectedVoice.value) {
        utterance.voice = selectedVoice.value
      }

      utterance.onstart = () => {
        isSpeaking.value = true
      }

      utterance.onend = () => {
        isSpeaking.value = false
        resolve()
      }

      utterance.onerror = (event) => {
        isSpeaking.value = false
        if (event.error !== 'interrupted') {
          reject(event)
        }
        else {
          resolve()
        }
      }

      setTimeout(() => {
        window.speechSynthesis.speak(utterance)
      }, 50)
    })
  }

  /* ═══════════════════════════════════════════
     UNIFIED SPEAK FUNCTION
     ═══════════════════════════════════════════ */

  async function speak(text: string, options?: {
    rate?: number
    pitch?: number
    volume?: number
    voiceType?: VoiceType
  }): Promise<void> {
    // Check if voice is enabled in settings
    if (!soundSettings.value.voiceEnabled) {
      return
    }

    const volume = (options?.volume ?? 1) * soundSettings.value.voiceVolume
    const voiceType = options?.voiceType ?? 'story'

    // Try Cloud TTS first if enabled
    if (useCloudTTS.value) {
      const success = await speakWithCloudTTS(text, voiceType)
      if (success) return
      // Disable cloud TTS for this session if it failed
      console.warn('Cloud TTS failed, falling back to browser TTS')
      useCloudTTS.value = false
    }

    // Fallback to browser TTS (adjust settings based on voice type)
    const browserOptions = voiceType === 'story'
      ? { rate: 0.8, pitch: 0.7, volume } // Slower, deeper for story
      : { rate: 0.95, pitch: 1.0, volume } // Normal for events
    await speakWithBrowserTTS(text, { ...browserOptions, ...options, volume })
  }

  /* ═══════════════════════════════════════════
     AMBIENT SOUNDS
     ═══════════════════════════════════════════ */

  function playAmbient(sound: AmbientSound, options?: {
    loop?: boolean
    volume?: number
    fadeIn?: boolean
  }): void {
    // Check if ambient is enabled in settings
    if (!soundSettings.value.ambientEnabled) {
      return
    }

    stopAmbient()

    const url = AMBIENT_SOUNDS[sound]
    if (!url) return

    const baseVolume = options?.volume ?? soundSettings.value.ambientVolume
    const audio = new Audio(url)
    audio.loop = options?.loop ?? false
    audio.volume = options?.fadeIn ? 0 : baseVolume
    ambientAudio.value = audio

    audio.play().catch((err) => {
      console.warn('Could not play ambient sound:', err)
    })

    // Fade in effect
    if (options?.fadeIn) {
      const targetVolume = baseVolume
      let currentVolume = 0
      const fadeInterval = setInterval(() => {
        currentVolume += 0.05
        if (currentVolume >= targetVolume) {
          audio.volume = targetVolume
          clearInterval(fadeInterval)
        }
        else {
          audio.volume = currentVolume
        }
      }, 100)
    }
  }

  function stopAmbient(fadeOut = false): void {
    if (!ambientAudio.value) return

    if (fadeOut) {
      const audio = ambientAudio.value
      const fadeInterval = setInterval(() => {
        if (audio.volume > 0.05) {
          audio.volume -= 0.05
        }
        else {
          audio.pause()
          clearInterval(fadeInterval)
        }
      }, 100)
    }
    else {
      ambientAudio.value.pause()
    }
    ambientAudio.value = null
  }

  function playSoundEffect(sound: AmbientSound): void {
    // Check if effects are enabled in settings
    if (!soundSettings.value.effectsEnabled) {
      return
    }

    const url = AMBIENT_SOUNDS[sound]
    if (!url) return

    const audio = new Audio(url)
    audio.volume = soundSettings.value.effectsVolume
    audio.play().catch((err) => {
      console.warn('Could not play sound effect:', err)
    })
  }

  /* ═══════════════════════════════════════════
     AI NARRATION
     ═══════════════════════════════════════════ */

  async function narrateWithAI(
    context: NarrationContext,
    data?: NarrationData,
    options?: { rate?: number; pitch?: number; voiceType?: VoiceType }
  ): Promise<string> {
    isGenerating.value = true

    // Use provided voiceType or determine from context
    const voiceType = options?.voiceType ?? getVoiceTypeForContext(context)

    try {
      const response = await $fetch<{ narration: string }>('/api/narration/generate', {
        method: 'POST',
        body: { context, data }
      })

      const ssmlNarration = response.narration || getDefaultMessage(context, data)
      await speak(ssmlNarration, { ...options, voiceType })
      // Return clean text for display (without SSML tags)
      return stripSSML(ssmlNarration)
    }
    catch (error) {
      console.error('AI narration failed:', error)
      const fallback = getDefaultMessage(context, data)
      await speak(fallback, { ...options, voiceType })
      return stripSSML(fallback)
    }
    finally {
      isGenerating.value = false
    }
  }

  function stop() {
    // Stop cloud TTS audio
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }

    // Stop browser TTS
    if (isSupported.value) {
      window.speechSynthesis.cancel()
    }

    isSpeaking.value = false
  }

  /* ═══════════════════════════════════════════
     BATCH GENERATION
     ═══════════════════════════════════════════ */

  async function generateBatch(
    gameId: string,
    contexts: BatchContext[]
  ): Promise<BatchResponse> {
    try {
      const response = await $fetch<BatchResponse>('/api/narration/batch', {
        method: 'POST',
        body: { gameId, contexts }
      })
      return response
    }
    catch (error) {
      console.error('Batch narration failed:', error)
      const narrations: Record<string, string> = {}
      for (const ctx of contexts) {
        narrations[ctx.context] = getDefaultMessage(ctx.context, ctx.data)
      }
      return { narrations: narrations as Record<NarrationContext, string>, storyTheme: '' }
    }
  }

  async function generateNightNarrations(
    gameId: string,
    dayNumber: number,
    hasWitch: boolean,
    hasSeer: boolean
  ): Promise<Record<NarrationContext, string>> {
    const contexts: BatchContext[] = [
      { context: 'night_start', data: { dayNumber } },
      { context: 'werewolves_wake' },
      { context: 'werewolves_done' }
    ]

    if (hasSeer) {
      contexts.push({ context: 'seer_wake' }, { context: 'seer_done' })
    }

    if (hasWitch) {
      contexts.push({ context: 'witch_wake' }, { context: 'witch_done' })
    }

    const result = await generateBatch(gameId, contexts)
    return result.narrations
  }

  async function generateDayNarrations(
    gameId: string,
    dayNumber: number,
    victimName?: string,
    killedBy?: NarrationData['killedBy']
  ): Promise<Record<NarrationContext, string>> {
    const contexts: BatchContext[] = [
      { context: 'day_start', data: { dayNumber } },
      { context: 'vote_start' }
    ]

    if (victimName) {
      contexts.push({ context: 'death_announce', data: { victimName, killedBy } })
    }

    const result = await generateBatch(gameId, contexts)
    return result.narrations
  }

  /* ═══════════════════════════════════════════
     CONVENIENCE METHODS
     ═══════════════════════════════════════════ */

  const narrate = {
    nightStart: (dayNumber: number) =>
      narrateWithAI('night_start', { dayNumber }),

    werewolvesWake: () =>
      narrateWithAI('werewolves_wake'),

    werewolvesDone: () =>
      narrateWithAI('werewolves_done'),

    seerWake: () =>
      narrateWithAI('seer_wake'),

    seerDone: () =>
      narrateWithAI('seer_done'),

    witchWake: () =>
      narrateWithAI('witch_wake'),

    witchDone: () =>
      narrateWithAI('witch_done'),

    dayStart: (dayNumber: number, aliveCount: number) =>
      narrateWithAI('day_start', { dayNumber, aliveCount }),

    death: (victimName: string, killedBy: NarrationData['killedBy']) =>
      narrateWithAI('death_announce', { victimName, killedBy }),

    voteStart: () =>
      narrateWithAI('vote_start'),

    voteResult: (victimName: string) =>
      narrateWithAI('vote_result', { victimName }),

    hunterDeath: (victimName: string) =>
      narrateWithAI('hunter_death', { victimName }),

    gameEnd: (winner: 'village' | 'werewolf') =>
      narrateWithAI('game_end', { winner })
  }

  // Ambient sound helpers for game phases
  const ambient = {
    startNight: () => playAmbient('night', { loop: true, fadeIn: true }),
    startDay: () => playAmbient('day', { loop: true, fadeIn: true }),
    startVote: () => playAmbient('vote', { loop: true }),
    playDeath: () => playSoundEffect('death'),
    playVictory: () => playSoundEffect('victory'),
    playDefeat: () => playSoundEffect('defeat'),
    playSuspense: () => playSoundEffect('suspense'),
    playTransition: () => playSoundEffect('transition'),
    // Role-specific sounds
    playWitch: () => playSoundEffect('witch'),
    playSeer: () => playSoundEffect('seer'),
    playWerewolves: () => playSoundEffect('werewolves'),
    playHunter: () => playSoundEffect('hunter'),
    // Day phase mood sounds
    playHappy: () => playSoundEffect('happy'),
    playSad: () => playSoundEffect('sad'),
    stop: () => stopAmbient(true)
  }

  // Legacy messages from config module
  const messages = LEGACY_MESSAGES

  return {
    // TTS
    speak,
    narrateWithAI,
    narrate,
    stop,
    isSpeaking,
    isGenerating,
    isSupported,
    selectedVoice,
    voicesLoaded,
    useCloudTTS,
    messages,
    // Batch methods
    generateBatch,
    generateNightNarrations,
    generateDayNarrations,
    // Ambient sounds
    ambient,
    playAmbient,
    stopAmbient,
    playSoundEffect,
    // Sound settings
    soundSettings
  }
}
