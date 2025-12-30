type NarrationContext = 'night_start' | 'werewolves_wake' | 'werewolves_done' | 'seer_wake' | 'seer_done' | 'witch_wake' | 'witch_done' | 'day_start' | 'death_announce' | 'vote_start' | 'vote_result' | 'hunter_death' | 'game_end'

interface NarrationData {
  victimName?: string
  killedBy?: 'werewolves' | 'witch' | 'hunter' | 'village'
  winner?: 'village' | 'werewolf'
  dayNumber?: number
  playerCount?: number
  aliveCount?: number
}

interface BatchContext {
  context: NarrationContext
  data?: NarrationData
}

interface BatchResponse {
  narrations: Record<NarrationContext, string>
  storyTheme: string
}

export function useNarrator() {
  const isSpeaking = ref(false)
  const isSupported = ref(false)
  const isGenerating = ref(false)
  const selectedVoice = ref<SpeechSynthesisVoice | null>(null)
  const voicesLoaded = ref(false)

  // Find the best French voice (prefer natural/neural voices)
  function findBestVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices()
    const frenchVoices = voices.filter(v => v.lang.startsWith('fr'))

    if (frenchVoices.length === 0) return null

    // Priority order for natural-sounding voices
    const preferredVoiceNames = [
      // Google high quality
      'Google français',
      // Microsoft Azure neural voices
      'Microsoft Henri',
      'Microsoft Claude',
      'Microsoft Paul',
      // Apple neural voices
      'Thomas',
      'Audrey',
      'Amélie',
      // Other common natural voices
      'Google French',
      'French France'
    ]

    // Try to find a preferred voice
    for (const preferred of preferredVoiceNames) {
      const voice = frenchVoices.find(v =>
        v.name.toLowerCase().includes(preferred.toLowerCase())
      )
      if (voice) return voice
    }

    // Prefer non-local voices (usually higher quality)
    const remoteVoice = frenchVoices.find(v => !v.localService)
    if (remoteVoice) return remoteVoice

    // Fallback to any French voice
    return frenchVoices[0] || null
  }

  // Initialize voices
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
      // Voices might load async
      initVoices()
      window.speechSynthesis.onvoiceschanged = initVoices
    }
  })

  // Speak with improved natural settings
  function speak(text: string, options?: {
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

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'fr-FR'

      // Natural narrator settings
      utterance.rate = options?.rate ?? 0.85 // Slightly slower for dramatic effect
      utterance.pitch = options?.pitch ?? 0.95 // Slightly lower for narrator voice
      utterance.volume = options?.volume ?? 1

      // Use the best available voice
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
        // Don't reject on 'interrupted' - it's expected when canceling
        if (event.error !== 'interrupted') {
          reject(event)
        } else {
          resolve()
        }
      }

      // Small delay to ensure voice is ready
      setTimeout(() => {
        window.speechSynthesis.speak(utterance)
      }, 50)
    })
  }

  // Generate AI narration and speak it
  async function narrateWithAI(
    context: NarrationContext,
    data?: NarrationData,
    options?: { rate?: number; pitch?: number }
  ): Promise<string> {
    isGenerating.value = true

    try {
      const response = await $fetch<{ narration: string }>('/api/narration/generate', {
        method: 'POST',
        body: { context, data }
      })

      const narration = response.narration || getDefaultMessage(context, data)
      await speak(narration, options)
      return narration
    }
    catch (error) {
      console.error('AI narration failed:', error)
      // Fallback to default message
      const fallback = getDefaultMessage(context, data)
      await speak(fallback, options)
      return fallback
    }
    finally {
      isGenerating.value = false
    }
  }

  function stop() {
    if (isSupported.value) {
      window.speechSynthesis.cancel()
      isSpeaking.value = false
    }
  }

  // Batch generate multiple narrations in one API call (much more efficient)
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
      // Return defaults on error
      const narrations: Record<string, string> = {}
      for (const ctx of contexts) {
        narrations[ctx.context] = getDefaultMessage(ctx.context, ctx.data)
      }
      return { narrations: narrations as Record<NarrationContext, string>, storyTheme: '' }
    }
  }

  // Generate all night phase narrations at once
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

  // Generate all day phase narrations at once
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

  // Default messages as fallback
  function getDefaultMessage(context: NarrationContext, data?: NarrationData): string {
    const messages: Record<NarrationContext, string> = {
      night_start: 'Le village s\'endort. La nuit tombe.',
      werewolves_wake: 'Les loups-garous se réveillent et désignent une victime.',
      werewolves_done: 'Les loups-garous se rendorment.',
      seer_wake: 'La voyante se réveille et consulte les esprits.',
      seer_done: 'La voyante se rendort.',
      witch_wake: 'La sorcière se réveille avec ses potions.',
      witch_done: 'La sorcière se rendort.',
      day_start: 'Le soleil se lève sur le village.',
      death_announce: data?.victimName
        ? `${data.victimName} a été trouvé mort ce matin.`
        : 'Un villageois a été trouvé mort.',
      vote_start: 'Le village doit voter pour éliminer un suspect.',
      vote_result: data?.victimName
        ? `Le village a décidé d'éliminer ${data.victimName}.`
        : 'Le village a rendu son verdict.',
      hunter_death: data?.victimName
        ? `${data.victimName} était le chasseur ! Il tire une dernière fois.`
        : 'Le chasseur tire une dernière fois.',
      game_end: data?.winner === 'village'
        ? 'Le village a éliminé tous les loups-garous !'
        : 'Les loups-garous ont dévoré le village.'
    }
    return messages[context]
  }

  // Convenience methods for common narrations
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
    speak,
    narrateWithAI,
    narrate,
    stop,
    isSpeaking,
    isGenerating,
    isSupported,
    selectedVoice,
    voicesLoaded,
    messages,
    // Batch methods (more efficient)
    generateBatch,
    generateNightNarrations,
    generateDayNarrations
  }
}
