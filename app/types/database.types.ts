export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          code: string
          status: 'lobby' | 'night' | 'day' | 'vote' | 'finished'
          phase_end_at: string | null
          day_number: number
          winner: 'village' | 'werewolf' | null
          settings: {
            discussion_time: number
            vote_time: number
            night_time: number
          }
          created_at: string
          host_id: string | null
        }
        Insert: {
          id?: string
          code: string
          status?: 'lobby' | 'night' | 'day' | 'vote' | 'finished'
          phase_end_at?: string | null
          day_number?: number
          winner?: 'village' | 'werewolf' | null
          settings?: {
            discussion_time: number
            vote_time: number
            night_time: number
          }
          created_at?: string
          host_id?: string | null
        }
        Update: {
          id?: string
          code?: string
          status?: 'lobby' | 'night' | 'day' | 'vote' | 'finished'
          phase_end_at?: string | null
          day_number?: number
          winner?: 'village' | 'werewolf' | null
          settings?: {
            discussion_time: number
            vote_time: number
            night_time: number
          }
          created_at?: string
          host_id?: string | null
        }
      }
      players: {
        Row: {
          id: string
          game_id: string
          name: string
          role: 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter' | null
          is_alive: boolean
          is_host: boolean
          witch_heal_used: boolean
          witch_kill_used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          name: string
          role?: 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter' | null
          is_alive?: boolean
          is_host?: boolean
          witch_heal_used?: boolean
          witch_kill_used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          name?: string
          role?: 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter' | null
          is_alive?: boolean
          is_host?: boolean
          witch_heal_used?: boolean
          witch_kill_used?: boolean
          created_at?: string
        }
      }
      night_actions: {
        Row: {
          id: string
          game_id: string
          day_number: number
          player_id: string
          action_type: 'werewolf_vote' | 'seer_look' | 'witch_heal' | 'witch_kill' | 'hunter_kill'
          target_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          day_number: number
          player_id: string
          action_type: 'werewolf_vote' | 'seer_look' | 'witch_heal' | 'witch_kill' | 'hunter_kill'
          target_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          day_number?: number
          player_id?: string
          action_type?: 'werewolf_vote' | 'seer_look' | 'witch_heal' | 'witch_kill' | 'hunter_kill'
          target_id?: string | null
          created_at?: string
        }
      }
      day_votes: {
        Row: {
          id: string
          game_id: string
          day_number: number
          voter_id: string
          target_id: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          day_number: number
          voter_id: string
          target_id: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          day_number?: number
          voter_id?: string
          target_id?: string
          created_at?: string
        }
      }
      game_events: {
        Row: {
          id: string
          game_id: string
          event_type: string
          message: string
          data: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          event_type: string
          message: string
          data?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          event_type?: string
          message?: string
          data?: Record<string, unknown>
          created_at?: string
        }
      }
    }
  }
}
