/**
 * Game Cleanup Composable
 * Handles player leave, cleanup on window close, and orphan game deletion
 */

import type { Game, Player } from '#shared/types/game'
import * as gameApi from '~/services/gameApi'

export function useGameCleanup(
  game: Ref<Game | null>,
  currentPlayer: Ref<Player | null>,
  gameCode: string
) {
  const { removePlayerId } = usePlayerStorage()

  /* ═══════════════════════════════════════════
     STATE (non-reactive for beforeunload)
     ═══════════════════════════════════════════ */

  let createdGameId: string | null = null
  let cachedGameId: string | null = null
  let cachedPlayerId: string | null = null
  let cachedGameStatus: string | null = null

  /* ═══════════════════════════════════════════
     LEAVE GAME
     ═══════════════════════════════════════════ */

  const isLeaving = ref(false)

  async function leaveGame(): Promise<void> {
    if (!game.value || !currentPlayer.value || isLeaving.value) return

    isLeaving.value = true
    try {
      await gameApi.leaveGame(game.value.id, currentPlayer.value.id)
      removePlayerId()
      navigateTo('/')
    }
    catch (e) {
      console.error('Failed to leave game:', e)
    }
    finally {
      isLeaving.value = false
    }
  }

  /* ═══════════════════════════════════════════
     CLEANUP ON WINDOW CLOSE
     ═══════════════════════════════════════════ */

  function updateCachedValues(): void {
    cachedGameId = game.value?.id || null
    cachedPlayerId = currentPlayer.value?.id || null
    cachedGameStatus = game.value?.status || null
  }

  function leaveOnClose(): void {
    // If creator leaves without joining, delete the orphan game
    if (createdGameId && !cachedPlayerId) {
      sessionStorage.removeItem('createdGame')
      const data = JSON.stringify({ gameId: createdGameId })
      const blob = new Blob([data], { type: 'application/json' })
      navigator.sendBeacon('/api/game/delete-orphan', blob)
      return
    }

    // Only auto-leave if in lobby phase
    if (cachedGameStatus === 'lobby' && cachedGameId && cachedPlayerId) {
      sessionStorage.setItem('pendingLeave', JSON.stringify({
        gameId: cachedGameId,
        playerId: cachedPlayerId
      }))

      const data = JSON.stringify({
        gameId: cachedGameId,
        playerId: cachedPlayerId
      })

      const blob = new Blob([data], { type: 'application/json' })
      navigator.sendBeacon('/api/game/leave', blob)
      removePlayerId()
    }
  }

  async function cleanupStalePlayer(): Promise<void> {
    // Clean up orphan games from previous sessions
    const createdGame = sessionStorage.getItem('createdGame')
    if (createdGame) {
      try {
        const { gameId, code } = JSON.parse(createdGame)
        if (code !== gameCode) {
          sessionStorage.removeItem('createdGame')
          await gameApi.deleteOrphanGame(gameId)
        }
        else {
          createdGameId = gameId
        }
      }
      catch {
        // Ignore errors
      }
    }

    // Clean up stale players
    const pendingLeave = sessionStorage.getItem('pendingLeave')
    if (pendingLeave) {
      sessionStorage.removeItem('pendingLeave')
      try {
        const { gameId, playerId } = JSON.parse(pendingLeave)
        await gameApi.leaveGame(gameId, playerId)
      }
      catch {
        // Ignore errors - player might already be deleted
      }
    }
  }

  function handleBeforeUnload(): void {
    leaveOnClose()
  }

  function handlePageHide(event: PageTransitionEvent): void {
    if (event.persisted) return
    leaveOnClose()
  }

  /* ═══════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════ */

  function setupCleanupListeners(): void {
    cleanupStalePlayer()
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)
  }

  function removeCleanupListeners(): void {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('pagehide', handlePageHide)
  }

  // Watch for game/player changes to update cached values
  watch([game, currentPlayer], updateCachedValues, { immediate: true })

  return {
    isLeaving,
    leaveGame,
    setupCleanupListeners,
    removeCleanupListeners,
    clearCreatedGame: () => {
      sessionStorage.removeItem('createdGame')
      createdGameId = null
    }
  }
}
