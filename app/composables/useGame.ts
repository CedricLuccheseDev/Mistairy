import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']
type GameEvent = Database['public']['Tables']['game_events']['Row']

export function useGame(gameCode: string) {
  const client = useSupabaseClient<Database>()
  const game = ref<Game | null>(null)
  const players = ref<Player[]>([])
  const currentPlayer = ref<Player | null>(null)
  const events = ref<GameEvent[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  let channel: RealtimeChannel | null = null

  async function fetchGame() {
    const { data, error: fetchError } = await client
      .from('games')
      .select('*')
      .eq('code', gameCode)
      .single()

    if (fetchError || !data) {
      error.value = 'Partie introuvable'
      // Rediriger vers l'accueil si la partie n'existe pas
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

      const playerId = localStorage.getItem('playerId')

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

  function subscribeToChanges() {
    if (!game.value) return

    channel = client
      .channel(`game:${game.value.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${game.value.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            game.value = payload.new as Game
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${game.value.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            players.value.push(payload.new as Player)
          }
          else if (payload.eventType === 'UPDATE') {
            const index = players.value.findIndex(p => p.id === (payload.new as Player).id)
            if (index !== -1) {
              players.value[index] = payload.new as Player
            }
            if (currentPlayer.value?.id === (payload.new as Player).id) {
              currentPlayer.value = payload.new as Player
            }
          }
          else if (payload.eventType === 'DELETE') {
            players.value = players.value.filter(p => p.id !== (payload.old as Player).id)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `game_id=eq.${game.value.id}`
        },
        (payload) => {
          events.value.push(payload.new as GameEvent)
        }
      )
      .subscribe()
  }

  async function initialize() {
    isLoading.value = true
    error.value = null

    await fetchGame()
    if (game.value) {
      await Promise.all([fetchPlayers(), fetchEvents()])
      subscribeToChanges()
    }

    isLoading.value = false
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

  return {
    game,
    players,
    currentPlayer,
    events,
    isLoading,
    error,
    alivePlayers,
    deadPlayers,
    isHost,
    canStartGame,
    otherWerewolves,
    refetch: initialize
  }
}
