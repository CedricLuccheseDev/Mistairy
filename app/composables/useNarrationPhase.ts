/**
 * Narration Phase Composable
 * Handles phase narration logic (intro, night, day, vote)
 */

import type { Game, Player, GameEvent } from '#shared/types/game'
import { stripSSML } from './useNarrator'

export type NarrationPhaseType = 'intro' | 'night' | 'day' | 'vote' | null

export function useNarrationPhase(
  game: Ref<Game | null>,
  players: Ref<Player[]>,
  alivePlayers: Ref<Player[]>,
  events: Ref<GameEvent[]>
) {
  const narrator = useNarrator()

  /* ═══════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════ */

  const narrationPhase = ref<NarrationPhaseType>(null)
  const narrationText = ref('')
  const lastNarratedPhase = ref<string | null>(null)

  /* ═══════════════════════════════════════════
     NARRATION FUNCTIONS
     ═══════════════════════════════════════════ */

  async function playPreamble(): Promise<void> {
    if (!game.value) return

    narrationPhase.value = 'intro'

    let narration = ''
    try {
      const response = await $fetch<{ narration: string }>('/api/narration/generate', {
        method: 'POST',
        body: {
          context: 'night_start',
          data: {
            dayNumber: 1,
            playerCount: players.value.length,
            playerNames: players.value.map(p => p.name)
          }
        }
      })
      narration = response.narration || `Bienvenue dans ce village paisible... ${players.value.length} âmes s'apprêtent à vivre une nuit de terreur.`
    }
    catch {
      narration = `Bienvenue dans ce village paisible... ${players.value.length} âmes s'apprêtent à vivre une nuit de terreur.`
    }

    narrationText.value = stripSSML(narration)
    await narrator.speak(narration, { rate: 0.85, voiceType: 'story' })
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (narrationPhase.value === 'intro') {
      narrationPhase.value = null
    }
  }

  async function playNightNarration(): Promise<void> {
    if (!game.value) return

    narrationPhase.value = 'night'

    let narration = ''
    try {
      const response = await $fetch<{ narration: string }>('/api/narration/generate', {
        method: 'POST',
        body: {
          context: 'night_start',
          data: { dayNumber: game.value.day_number, aliveCount: alivePlayers.value.length }
        }
      })
      narration = response.narration || `Nuit ${game.value.day_number}. Le village s'endort...`
    }
    catch {
      narration = `Nuit ${game.value.day_number}. Le village s'endort...`
    }

    narrationText.value = stripSSML(narration)
    await narrator.speak(narration, { rate: 0.85, voiceType: 'story' })
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (narrationPhase.value === 'night') {
      narrationPhase.value = null
    }
  }

  async function playDayNarration(): Promise<void> {
    if (!game.value) return

    narrationPhase.value = 'day'

    // Find victims from the latest night_end event
    const nightEndEvent = events.value.find(
      e => e.event_type === 'night_end' &&
        (e.data as Record<string, unknown>)?.day_number === game.value?.day_number
    )
    const nightData = nightEndEvent?.data as { dead?: Array<{ name: string; killedBy?: string }> } | undefined
    const victims = nightData?.dead || []

    let narration = ''
    try {
      const response = await $fetch<{ narration: string }>('/api/narration/generate', {
        method: 'POST',
        body: {
          context: 'day_start',
          data: {
            dayNumber: game.value.day_number,
            aliveCount: alivePlayers.value.length,
            victimName: victims[0]?.name,
            killedBy: (victims[0]?.killedBy as 'werewolves' | 'witch' | 'hunter' | 'village') || 'werewolves'
          }
        }
      })
      narration = response.narration || `Le soleil se lève sur le village...`
    }
    catch {
      narration = `Le soleil se lève sur le village...`
    }

    narrationText.value = stripSSML(narration)
    await narrator.speak(narration, { rate: 0.85, voiceType: 'story' })
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (narrationPhase.value === 'day') {
      narrationPhase.value = null
    }
  }

  async function playVoteNarration(): Promise<void> {
    if (!game.value) return

    narrationPhase.value = 'vote'

    let narration = ''
    try {
      const response = await $fetch<{ narration: string }>('/api/narration/generate', {
        method: 'POST',
        body: {
          context: 'vote_start',
          data: { dayNumber: game.value.day_number, aliveCount: alivePlayers.value.length }
        }
      })
      narration = response.narration || `L'heure du jugement a sonné...`
    }
    catch {
      narration = `L'heure du jugement a sonné...`
    }

    narrationText.value = stripSSML(narration)
    await narrator.speak(narration, { rate: 0.85, voiceType: 'story' })
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (narrationPhase.value === 'vote') {
      narrationPhase.value = null
    }
  }

  function skipNarration(): void {
    narrator.stop()
    narrationPhase.value = null
  }

  function stopAmbient(): void {
    narrator.ambient.stop()
  }

  /* ═══════════════════════════════════════════
     PHASE TRACKING
     ═══════════════════════════════════════════ */

  function shouldNarrate(status: string, dayNumber: number): boolean {
    const phaseKey = `${status}-${dayNumber}`
    if (lastNarratedPhase.value === phaseKey) return false
    lastNarratedPhase.value = phaseKey
    return true
  }

  function isNarrationEnabled(): boolean {
    if (!game.value) return false
    const settings = game.value.settings as { narration_enabled?: boolean }
    return settings.narration_enabled !== false
  }

  return {
    // State
    narrationPhase,
    narrationText,

    // Narration functions
    playPreamble,
    playNightNarration,
    playDayNarration,
    playVoteNarration,
    skipNarration,
    stopAmbient,

    // Helpers
    shouldNarrate,
    isNarrationEnabled,

    // Expose narrator for ambient sounds
    narrator
  }
}
