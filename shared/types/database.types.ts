export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Game settings type (stored as Json in DB, use with type assertion)
export interface GameSettings {
  night_time: number
  discussion_time: number
  vote_time: number
  max_players: number
  narration_enabled: boolean
  roles: {
    seer: boolean
    witch: boolean
    hunter: boolean
  }
}

export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          code: string
          status: 'lobby' | 'intro' | 'night' | 'day' | 'vote' | 'hunter' | 'finished'
          phase_end_at: string | null
          day_number: number
          winner: 'village' | 'werewolf' | null
          settings: Json
          created_at: string
          host_id: string | null
          hunter_target_pending: string | null
        }
        Insert: {
          id?: string
          code: string
          status?: 'lobby' | 'intro' | 'night' | 'day' | 'vote' | 'hunter' | 'finished'
          phase_end_at?: string | null
          day_number?: number
          winner?: 'village' | 'werewolf' | null
          settings?: Json
          created_at?: string
          host_id?: string | null
          hunter_target_pending?: string | null
        }
        Update: {
          id?: string
          code?: string
          status?: 'lobby' | 'intro' | 'night' | 'day' | 'vote' | 'hunter' | 'finished'
          phase_end_at?: string | null
          day_number?: number
          winner?: 'village' | 'werewolf' | null
          settings?: Json
          created_at?: string
          host_id?: string | null
          hunter_target_pending?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          }
        ]
      }
      night_actions: {
        Row: {
          id: string
          game_id: string
          day_number: number
          player_id: string
          action_type: 'werewolf_vote' | 'seer_look' | 'witch_heal' | 'witch_kill' | 'witch_skip' | 'hunter_kill'
          target_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          day_number: number
          player_id: string
          action_type: 'werewolf_vote' | 'seer_look' | 'witch_heal' | 'witch_kill' | 'witch_skip' | 'hunter_kill'
          target_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          day_number?: number
          player_id?: string
          action_type?: 'werewolf_vote' | 'seer_look' | 'witch_heal' | 'witch_kill' | 'witch_skip' | 'hunter_kill'
          target_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "night_actions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "night_actions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "night_actions_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "day_votes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_votes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          }
        ]
      }
      day_ready: {
        Row: {
          id: string
          game_id: string
          day_number: number
          player_id: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          day_number: number
          player_id: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          day_number?: number
          player_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_ready_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_ready_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          }
        ]
      }
      game_events: {
        Row: {
          id: string
          game_id: string
          event_type: string
          message: string
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          event_type: string
          message: string
          data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          event_type?: string
          message?: string
          data?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
