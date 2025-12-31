type NarrationContext = 'night_start' | 'werewolves_wake' | 'werewolves_done' | 'seer_wake' | 'seer_done' | 'witch_wake' | 'witch_done' | 'day_start' | 'death_announce' | 'vote_start' | 'vote_result' | 'hunter_death' | 'game_end'

// Strip SSML tags for display purposes (exported for use in components)
export function stripSSML(text: string): string {
  return text
    // Remove break tags
    .replace(/<break[^>]*\/?>/gi, ' ')
    // Remove emphasis tags but keep content
    .replace(/<emphasis[^>]*>(.*?)<\/emphasis>/gi, '$1')
    // Remove prosody tags but keep content
    .replace(/<prosody[^>]*>(.*?)<\/prosody>/gi, '$1')
    // Remove any other XML tags
    .replace(/<[^>]+>/g, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
}

interface NarrationData {
  victimName?: string
  killedBy?: 'werewolves' | 'witch' | 'hunter' | 'village'
  winner?: 'village' | 'werewolf'
  dayNumber?: number
  playerCount?: number
  aliveCount?: number
  playerNames?: string[]
}

interface BatchContext {
  context: NarrationContext
  data?: NarrationData
}

interface BatchResponse {
  narrations: Record<NarrationContext, string>
  storyTheme: string
}

interface TTSResponse {
  success: boolean
  audio?: string
  contentType?: string
  useFallback?: boolean
  message?: string
}

type AmbientSound = 'night' | 'day' | 'vote' | 'death' | 'victory' | 'defeat' | 'suspense' | 'transition'

// Voice types: 'story' for atmospheric narration, 'event' for game announcements
type VoiceType = 'story' | 'event'

// Ambient sound URLs
const AMBIENT_SOUNDS: Record<AmbientSound, string> = {
  night: '/sounds/night.mp3',
  day: '/sounds/day.mp3',
  vote: '/sounds/night.mp3', // Reuse night for vote tension
  death: '/sounds/night.mp3',
  victory: '/sounds/day.mp3',
  defeat: '/sounds/night.mp3',
  suspense: '/sounds/night.mp3',
  transition: '/sounds/day.mp3'
}

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

  // Find the best French voice (prefer natural/neural voices)
  function findBestVoice(): SpeechSynthesisVoice | null {
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

  function initVoices() {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      selectedVoice.value = findBestVoice()
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

  // Determine voice type based on narration context
  function getVoiceTypeForContext(context: NarrationContext): VoiceType {
    // Story narration contexts (atmospheric, deep voice)
    const storyContexts: NarrationContext[] = [
      'night_start', 'werewolves_wake', 'werewolves_done',
      'seer_wake', 'seer_done', 'witch_wake', 'witch_done',
      'day_start', 'game_end'
    ]

    // Event contexts (announcements, female voice)
    // death_announce, vote_start, vote_result, hunter_death
    return storyContexts.includes(context) ? 'story' : 'event'
  }

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
     DEFAULT MESSAGES
     ═══════════════════════════════════════════ */

  function getDefaultMessage(context: NarrationContext, data?: NarrationData): string {
    // Default messages with SSML for natural speech pauses and emphasis
    const messages: Record<NarrationContext, string> = {
      night_start: 'La nuit tombe sur le village.<break time="400ms"/> Fermez les yeux.',
      werewolves_wake: 'Les <emphasis level="moderate">loups-garous</emphasis> se réveillent.<break time="300ms"/> Ils choisissent leur victime.',
      werewolves_done: 'Les loups-garous se rendorment.<break time="300ms"/>',
      seer_wake: 'La <emphasis level="moderate">voyante</emphasis> se réveille.<break time="300ms"/> Elle peut découvrir un rôle.',
      seer_done: 'La voyante se rendort.<break time="300ms"/>',
      witch_wake: 'La <emphasis level="moderate">sorcière</emphasis> se réveille avec ses potions.<break time="300ms"/>',
      witch_done: 'La sorcière se rendort.<break time="300ms"/>',
      day_start: data?.victimName
        ? `Le soleil se lève.<break time="400ms"/> <emphasis level="strong">${data.victimName}</emphasis> a été trouvé <emphasis level="moderate">mort</emphasis> ce matin.`
        : 'Le soleil se lève.<break time="400ms"/> Le village se réveille. Personne n\'est mort cette nuit.',
      death_announce: data?.victimName
        ? `<emphasis level="strong">${data.victimName}</emphasis> a été retrouvé <emphasis level="moderate">mort</emphasis> ce matin.<break time="500ms"/>`
        : 'Un villageois a été <emphasis level="moderate">tué</emphasis> cette nuit.<break time="500ms"/>',
      vote_start: 'Le village doit voter.<break time="300ms"/> Trouvez le <emphasis level="moderate">loup</emphasis> parmi vous.',
      vote_result: data?.victimName
        ? `Le village a décidé d'éliminer <emphasis level="strong">${data.victimName}</emphasis>.<break time="400ms"/>`
        : 'Le village a rendu son verdict.<break time="400ms"/>',
      hunter_death: data?.victimName
        ? `<emphasis level="strong">${data.victimName}</emphasis> était le chasseur!<break time="400ms"/> Il peut tirer sur quelqu'un.`
        : 'Le <emphasis level="moderate">chasseur</emphasis> tire une dernière fois.<break time="400ms"/>',
      game_end: data?.winner === 'village'
        ? '<prosody rate="slow">Félicitations!</prosody><break time="500ms"/> Le village a éliminé tous les <emphasis level="moderate">loups-garous</emphasis>!'
        : 'Les <emphasis level="moderate">loups-garous</emphasis> ont gagné.<break time="500ms"/> Ils ont dévoré le village.'
    }
    return messages[context]
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
    stop: () => stopAmbient(true)
  }

  // Legacy messages for backward compatibility
  const messages = {
    nightStart: 'Le village s\'endort. La nuit tombe sur le village.',
    werewolvesWake: 'Les loups-garous se réveillent et désignent une victime.',
    werewolvesSleep: 'Les loups-garous se rendorment.',
    seerWakes: 'La voyante se réveille et peut découvrir l\'identité d\'un joueur.',
    seerSleeps: 'La voyante se rendort.',
    witchWakes: 'La sorcière se réveille.',
    witchSleeps: 'La sorcière se rendort.',
    dayStart: 'Le soleil se lève sur le village.',
    noDeathNight: 'Miracle ! Personne n\'est mort cette nuit.',
    deathNight: (name: string) => `${name} a été dévoré par les loups-garous cette nuit.`,
    voteStart: 'Le village doit maintenant voter pour éliminer un suspect.',
    voteResult: (name: string) => `Le village a décidé d'éliminer ${name}.`,
    noVote: 'Le village n\'a pas réussi à se mettre d\'accord.',
    hunterDeath: (name: string) => `${name} était le chasseur ! Il peut emporter quelqu'un dans la tombe.`,
    villageWins: 'Félicitations ! Le village a éliminé tous les loups-garous !',
    werewolvesWin: 'Les loups-garous ont dévoré tous les villageois. Ils remportent la partie !'
  }

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
