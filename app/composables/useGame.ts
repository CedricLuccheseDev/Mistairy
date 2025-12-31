import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']
type GameEvent = Database['public']['Tables']['game_events']['Row']

export function useGame(gameCode: string) {
  const client = useSupabaseClient<Database>()
  const { getPlayerId } = usePlayerStorage()

  /* ═══════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════ */

  const game = ref<Game | null>(null)
  const players = ref<Player[]>([])
  const currentPlayer = ref<Player | null>(null)
  const events = ref<GameEvent[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const hasInitialized = ref(false)

  let channel: RealtimeChannel | null = null

  /* ═══════════════════════════════════════════
     FETCH FUNCTIONS
     ═══════════════════════════════════════════ */

  async function fetchGame() {
    const { data, error: fetchError } = await client
      .from('games')
      .select('*')
      .eq('code', gameCode)
      .single()

    if (fetchError || !data) {
      error.value = 'Partie introuvable'
      navigateTo('/')
      return
    }

    game.value = data
  }

  async function fetchPlayers() {
    if (!game.value) return

    const { data } = await client
      .from('players')
      .select('*')
      .eq('game_id', game.value.id)
      .order('created_at', { ascending: true })

    if (data) {
      players.value = data

      const playerId = getPlayerId()
      if (playerId) {
        currentPlayer.value = data.find(p => p.id === playerId) || null
      }
    }
  }

  async function fetchEvents() {
    if (!game.value) return

    const { data } = await client
      .from('game_events')
      .select('*')
      .eq('game_id', game.value.id)
      .order('created_at', { ascending: true })

    if (data) {
      events.value = data
    }
  }

  /* ═══════════════════════════════════════════
     REALTIME SUBSCRIPTIONS
     ═══════════════════════════════════════════ */

  function subscribeToChanges() {
    if (!game.value) return

    // Clean up existing subscription before creating a new one
    if (channel) {
      client.removeChannel(channel)
      channel = null
    }

    const gameId = game.value.id
    const ch = client.channel(`game:${gameId}`)

    // Game changes
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (payload) => {
      if (payload.eventType === 'UPDATE') {
        game.value = payload.new as Game
      }
      else if (payload.eventType === 'DELETE') {
        // Game was deleted - redirect all players to home
        cleanup()
        navigateTo('/')
      }
    })

    // Player changes
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` }, (payload) => {
      const newPlayer = payload.new as Player
      const oldPlayer = payload.old as Player

      if (payload.eventType === 'INSERT') {
        // Check if player already exists to avoid duplicates
        if (!players.value.some(p => p.id === newPlayer.id)) {
          players.value.push(newPlayer)
        }
      }
      else if (payload.eventType === 'UPDATE') {
        const index = players.value.findIndex(p => p.id === newPlayer.id)
        if (index !== -1) {
          players.value[index] = newPlayer
        }
        if (currentPlayer.value?.id === newPlayer.id) {
          currentPlayer.value = newPlayer
        }
      }
      else if (payload.eventType === 'DELETE') {
        // oldPlayer.id might be undefined if REPLICA IDENTITY is not FULL
        const deletedId = oldPlayer?.id
        if (deletedId) {
          players.value = players.value.filter(p => p.id !== deletedId)
        }
        else {
          // Fallback: refetch players if we can't determine which was deleted
          fetchPlayers()
        }
      }
    })

    // Game events
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_events', filter: `game_id=eq.${gameId}` }, (payload) => {
      const newEvent = payload.new as GameEvent
      // Check if event already exists to avoid duplicates
      if (!events.value.some(e => e.id === newEvent.id)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Supabase generic types cause excessive recursion
        events.value.push(newEvent)
      }
    })

    ch.subscribe()
    channel = ch
  }

  /* ═══════════════════════════════════════════
     COMPUTED PROPERTIES
     ═══════════════════════════════════════════ */

  const alivePlayers = computed(() => players.value.filter(p => p.is_alive))
  const deadPlayers = computed(() => players.value.filter(p => !p.is_alive))
  const isHost = computed(() => currentPlayer.value?.is_host ?? false)
  const canStartGame = computed(() => players.value.length >= 5 && game.value?.status === 'lobby')

  const otherWerewolves = computed(() => {
    if (currentPlayer.value?.role !== 'werewolf') return []
    return players.value.filter(
      p => p.role === 'werewolf' && p.id !== currentPlayer.value?.id && p.is_alive
    )
  })

  /* ═══════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════ */

  async function initialize() {
    // Only show loading spinner on first initialization
    if (!hasInitialized.value) {
      isLoading.value = true
    }
    error.value = null

    await fetchGame()
    if (game.value) {
      await Promise.all([fetchPlayers(), fetchEvents()])
      subscribeToChanges()
    }

    isLoading.value = false
    hasInitialized.value = true
  }

  function cleanup() {
    if (channel) {
      client.removeChannel(channel)
      channel = null
    }
  }

  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    cleanup()
  })

  /* ═══════════════════════════════════════════
     RETURN
     ═══════════════════════════════════════════ */

  return {
    // State
    game,
    players,
    currentPlayer,
    events,
    isLoading,
    error,
    // Computed
    alivePlayers,
    deadPlayers,
    isHost,
    canStartGame,
    otherWerewolves,
    // Methods
    refetch: initialize
  }
}
