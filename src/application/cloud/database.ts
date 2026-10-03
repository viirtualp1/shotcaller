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
          mode: string
          ranked: boolean
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
          paused_by: string | null
          paused_at: string | null
          host_pauses: number
          guest_pauses: number
          host_paused_last: string | null
          guest_paused_last: string | null
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
      delete_account: {
        Args: Record<string, never>
        Returns: undefined
      }
      mmr_leaderboard: {
        Args: { game_mode: string }
        Returns: {
          id: string
          position: number
          name: string
          avatar: string | null
          photo: string | null
          rating: number
        }[]
      }
      find_match: {
        Args: { game_mode: string; game_balance: string }
        Returns: string | null
      }
      leave_queue: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      submit_feedback: {
        Args: {
          request_id: string
          category: string
          subject: string
          message: string
          reply_email: string | null
          game_version: string
          language: string
        }
        Returns: undefined
      }
      reserve_telemetry: {
        Args: { policy_version: number; match_id: string; finished_at: string }
        Returns: Json
      }
      my_privacy: { Args: Record<PropertyKey, never>; Returns: Json }
      set_privacy: {
        Args: { policy_version: number; allow_telemetry: boolean }
        Returns: Json
      }
      ensure_coach: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          friend_code: string
          name: string
          avatar: string | null
          photo: string | null
          rating: number
          updated_at: string
        }
      }
      set_coach_photo: {
        Args: { url: string | null }
        Returns: undefined
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
          photo: string | null
          rating: number
          since: string
        }[]
      }
      invite_duel: {
        Args: { friend: string; game_mode?: string }
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
      withdraw_board: {
        Args: { duel: string; board_round: number }
        Returns: boolean
      }
      report_duel: {
        Args: { duel: string; winning_side: number | null; by_throne?: boolean }
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
      pause_duel: {
        Args: { duel: string }
        Returns: undefined
      }
      resume_duel: {
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
          mode?: string
          seed: string | null
          round: number
          round_opened_at: string | null
          host_board_round: number
          guest_board_round: number
          created_at: string
          paused_by?: string | null
          paused_at?: string | null
          host_pauses?: number
          guest_pauses?: number
          host_paused_last?: string | null
          guest_paused_last?: string | null
          opponent_name: string
          opponent_avatar: string | null
          opponent_photo: string | null
          opponent_rating: number
        }[]
      }
      coach_profile: {
        Args: { friend: string }
        Returns: Json
      }
      my_ratings: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      coach_match: {
        Args: { friend: string; match_id: string }
        Returns: Json
      }
      publish_live_match: {
        Args: { payload: Json }
        Returns: boolean
      }
      keep_live_match: {
        Args: Record<PropertyKey, never>
        Returns: boolean | null
      }
      friends_online: {
        Args: { doing: string | null; doing_round: number | null }
        Returns: { id: string; activity: string; round: number | null }[]
      }
      coach_live_match: {
        Args: { friend: string }
        Returns: Json
      }
      list_friends: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          avatar: string | null
          photo: string | null
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
