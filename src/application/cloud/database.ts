import type { Json } from './json'

/** The tables and functions from `supabase/migrations`, typed by hand to keep the client honest. */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          avatar: string | null
          rating: number
          revision: number
          data: Json
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          avatar: string | null
          rating: number
          revision: number
          data: Json
        }
        Update: {
          name?: string
          avatar?: string | null
          rating?: number
          revision?: number
          data?: Json
        }
        Relationships: []
      }
      matches: {
        Row: {
          user_id: string
          id: string
          played_at: string
          verdict: string
          data: Json
          created_at: string
        }
        Insert: {
          user_id: string
          id: string
          played_at: string
          verdict: string
          data: Json
        }
        Update: never
        Relationships: []
      }
      duels: {
        Row: {
          id: string
          host: string
          guest: string
          status: string
          seed: string | null
          round: number
          round_opened_at: string | null
          host_board_round: number
          guest_board_round: number
          host_result: number | null
          guest_result: number | null
          winner: string | null
          ended_by: string | null
          created_at: string
          started_at: string | null
          finished_at: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      duel_boards: {
        Row: {
          duel_id: string
          round: number
          side: number
          board: Json
          submitted_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      messages: {
        Row: {
          id: number
          sender: string
          recipient: string
          body: string
          created_at: string
          read_at: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      friendships: {
        Row: {
          requester: string
          addressee: string
          accepted: boolean
          created_at: string
          accepted_at: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      ensure_coach: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          friend_code: string
          name: string
          avatar: string | null
          rating: number
          updated_at: string
        }
      }
      request_friend: {
        Args: { code: string }
        Returns: string
      }
      respond_friend: {
        Args: { other: string; accept: boolean }
        Returns: undefined
      }
      remove_friend: {
        Args: { other: string }
        Returns: undefined
      }
      send_message: {
        Args: { friend: string; message: string }
        Returns: Database['public']['Tables']['messages']['Row']
      }
      conversation: {
        Args: { friend: string; older_than?: number }
        Returns: Database['public']['Tables']['messages']['Row'][]
      }
      mark_read: {
        Args: { friend: string }
        Returns: undefined
      }
      unread_counts: {
        Args: Record<PropertyKey, never>
        Returns: { sender: string; unread: number }[]
      }
      block_coach: {
        Args: { other: string }
        Returns: undefined
      }
      unblock_coach: {
        Args: { other: string }
        Returns: undefined
      }
      list_blocked: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          avatar: string | null
          rating: number
          since: string
        }[]
      }
      invite_duel: {
        Args: { friend: string }
        Returns: string
      }
      respond_duel: {
        Args: { duel: string; accept: boolean }
        Returns: undefined
      }
      cancel_duel: {
        Args: { duel: string }
        Returns: undefined
      }
      submit_board: {
        Args: { duel: string; board_round: number; payload: Json }
        Returns: Json
      }
      duel_board: {
        Args: { duel: string; board_round: number }
        Returns: Json
      }
      report_duel: {
        Args: { duel: string; winning_side: number | null }
        Returns: undefined
      }
      forfeit_duel: {
        Args: { duel: string }
        Returns: undefined
      }
      claim_duel: {
        Args: { duel: string }
        Returns: undefined
      }
      my_duels: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          host: string
          guest: string
          status: string
          seed: string | null
          round: number
          round_opened_at: string | null
          host_board_round: number
          guest_board_round: number
          created_at: string
          opponent_name: string
          opponent_avatar: string | null
          opponent_rating: number
        }[]
      }
      coach_profile: {
        Args: { friend: string }
        Returns: Json
      }
      list_friends: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          avatar: string | null
          rating: number
          status: string
          since: string
        }[]
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
