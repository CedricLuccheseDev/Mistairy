/**
 * Text-to-Speech Utilities
 */

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

