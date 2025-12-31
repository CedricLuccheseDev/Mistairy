// Storage abstraction for playerId
// Use sessionStorage in test mode (per-tab), localStorage otherwise

export function usePlayerStorage() {
  const route = useRoute()

  // Test mode is enabled with ?test or ?testMode query param
  const isTestMode = computed(() => {
    return route.query.test !== undefined || route.query.testMode !== undefined
  })

  function getStorage(): Storage | null {
    if (import.meta.server) return null
    return isTestMode.value ? sessionStorage : localStorage
  }

  function getPlayerId(): string | null {
    const storage = getStorage()
    if (!storage) return null

    // Check if playerId is in URL query (for admin test mode)
    const urlPlayerId = route.query.playerId as string | undefined
    if (urlPlayerId && isTestMode.value) {
      // Store it in session storage and return it
      storage.setItem('playerId', urlPlayerId)
      return urlPlayerId
    }

    return storage.getItem('playerId')
  }

  function setPlayerId(id: string): void {
    const storage = getStorage()
    if (!storage) return
    storage.setItem('playerId', id)
  }

  function removePlayerId(): void {
    const storage = getStorage()
    if (!storage) return
    storage.removeItem('playerId')
  }

  return {
    isTestMode,
    getPlayerId,
    setPlayerId,
    removePlayerId
  }
}
