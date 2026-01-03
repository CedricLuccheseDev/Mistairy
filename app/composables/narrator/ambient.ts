/**
 * Ambient Sound Management
 * Handles background music and sound effects
 */

import type { AmbientSound } from './types'

// Ambient sound URLs
export const AMBIENT_SOUNDS: Record<AmbientSound, string> = {
  night: '/sounds/night.mp3',
  day: '/sounds/day.mp3',
  vote: '/sounds/night.mp3', // Reuse night for vote tension
  death: '/sounds/night.mp3',
  victory: '/sounds/day.mp3',
  defeat: '/sounds/night.mp3',
  suspense: '/sounds/night.mp3',
  transition: '/sounds/day.mp3'
}

export interface AmbientOptions {
  loop?: boolean
  volume?: number
  fadeIn?: boolean
}

/**
 * Create ambient sound controller
 */
export function createAmbientController(getSoundSettings: () => {
  ambientEnabled: boolean
  ambientVolume: number
  effectsEnabled: boolean
  effectsVolume: number
}) {
  let ambientAudio: HTMLAudioElement | null = null

  function playAmbient(sound: AmbientSound, options?: AmbientOptions): void {
    const settings = getSoundSettings()
    if (!settings.ambientEnabled) return

    stopAmbient()

    const url = AMBIENT_SOUNDS[sound]
    if (!url) return

    const baseVolume = options?.volume ?? settings.ambientVolume
    const audio = new Audio(url)
    audio.loop = options?.loop ?? false
    audio.volume = options?.fadeIn ? 0 : baseVolume
    ambientAudio = audio

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
    if (!ambientAudio) return

    if (fadeOut) {
      const audio = ambientAudio
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
      ambientAudio.pause()
    }
    ambientAudio = null
  }

  function playSoundEffect(sound: AmbientSound): void {
    const settings = getSoundSettings()
    if (!settings.effectsEnabled) return

    const url = AMBIENT_SOUNDS[sound]
    if (!url) return

    const audio = new Audio(url)
    audio.volume = settings.effectsVolume
    audio.play().catch((err) => {
      console.warn('Could not play sound effect:', err)
    })
  }

  // Convenience methods for game phases
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

  return {
    playAmbient,
    stopAmbient,
    playSoundEffect,
    ambient
  }
}
