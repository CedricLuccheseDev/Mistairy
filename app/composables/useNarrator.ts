export function useNarrator() {
  const isSpeaking = ref(false)
  const isSupported = ref(false)

  onMounted(() => {
    isSupported.value = 'speechSynthesis' in window
  })

  function speak(text: string, options?: { rate?: number, pitch?: number }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isSupported.value) {
        console.warn('Speech synthesis not supported')
        resolve()
        return
      }

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'fr-FR'
      utterance.rate = options?.rate ?? 0.9
      utterance.pitch = options?.pitch ?? 1

      const voices = window.speechSynthesis.getVoices()
      const frenchVoice = voices.find(v => v.lang.startsWith('fr'))
      if (frenchVoice) {
        utterance.voice = frenchVoice
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
        reject(event)
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  function stop() {
    if (isSupported.value) {
      window.speechSynthesis.cancel()
      isSpeaking.value = false
    }
  }

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
    stop,
    isSpeaking,
    isSupported,
    messages
  }
}
