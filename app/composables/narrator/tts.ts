/**
 * Text-to-Speech Management
 * Handles Cloud TTS and Browser TTS fallback
 */

import type { VoiceType, TTSResponse } from './types'

/**
 * Strip SSML tags for display or browser TTS
 */
export function stripSSML(text: string): string {
  return text
    .replace(/<break[^>]*\/?>/gi, ' ')
    .replace(/<emphasis[^>]*>(.*?)<\/emphasis>/gi, '$1')
    .replace(/<prosody[^>]*>(.*?)<\/prosody>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Find the best French voice for browser TTS
 */
export function findBestFrenchVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const frenchVoices = voices.filter(v => v.lang.startsWith('fr'))

  if (frenchVoices.length === 0) return null

  // Priority order for natural-sounding voices
  const preferredVoiceNames = [
    'Google français',
    'Microsoft Henri',
    'Microsoft Claude',
    'Microsoft Paul',
    'Thomas',
    'Audrey',
    'Amélie',
    'Google French',
    'French France'
  ]

  for (const preferred of preferredVoiceNames) {
    const voice = frenchVoices.find(v =>
      v.name.toLowerCase().includes(preferred.toLowerCase())
    )
    if (voice) return voice
  }

  const remoteVoice = frenchVoices.find(v => !v.localService)
  if (remoteVoice) return remoteVoice

  return frenchVoices[0] || null
}

/**
 * Create TTS controller
 */
export function createTTSController(getSoundSettings: () => {
  voiceEnabled: boolean
  voiceVolume: number
}) {
  const isSpeaking = ref(false)
  const isSupported = ref(false)
  const selectedVoice = ref<SpeechSynthesisVoice | null>(null)
  const voicesLoaded = ref(false)
  const useCloudTTS = ref(true)
  let currentAudio: HTMLAudioElement | null = null

  function initVoices() {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      selectedVoice.value = findBestFrenchVoice()
      voicesLoaded.value = true
    }
  }

  function init() {
    isSupported.value = 'speechSynthesis' in window
    if (isSupported.value) {
      initVoices()
      window.speechSynthesis.onvoiceschanged = initVoices
    }
  }

  async function speakWithCloudTTS(text: string, voiceType: VoiceType = 'story'): Promise<boolean> {
    try {
      const voiceConfig = voiceType === 'story'
        ? { voice: 'male' as const, speakingRate: 0.85, pitch: -4.0 }
        : { voice: 'female' as const, speakingRate: 1.0, pitch: 0 }

      const response = await $fetch<TTSResponse>('/api/tts/speak', {
        method: 'POST',
        body: { text, ...voiceConfig }
      })

      if (!response.success || response.useFallback || !response.audio) {
        return false
      }

      return new Promise((resolve) => {
        const audio = new Audio(`data:${response.contentType};base64,${response.audio}`)
        currentAudio = audio

        audio.onended = () => {
          isSpeaking.value = false
          currentAudio = null
          resolve(true)
        }

        audio.onerror = () => {
          isSpeaking.value = false
          currentAudio = null
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

  async function speak(text: string, options?: {
    rate?: number
    pitch?: number
    volume?: number
    voiceType?: VoiceType
  }): Promise<void> {
    const settings = getSoundSettings()
    if (!settings.voiceEnabled) return

    const volume = (options?.volume ?? 1) * settings.voiceVolume
    const voiceType = options?.voiceType ?? 'story'

    if (useCloudTTS.value) {
      const success = await speakWithCloudTTS(text, voiceType)
      if (success) return
      console.warn('Cloud TTS failed, falling back to browser TTS')
      useCloudTTS.value = false
    }

    const browserOptions = voiceType === 'story'
      ? { rate: 0.8, pitch: 0.7, volume }
      : { rate: 0.95, pitch: 1.0, volume }
    await speakWithBrowserTTS(text, { ...browserOptions, ...options, volume })
  }

  function stop() {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio = null
    }
    if (isSupported.value) {
      window.speechSynthesis.cancel()
    }
    isSpeaking.value = false
  }

  return {
    init,
    speak,
    stop,
    isSpeaking,
    isSupported,
    selectedVoice,
    voicesLoaded,
    useCloudTTS
  }
}
