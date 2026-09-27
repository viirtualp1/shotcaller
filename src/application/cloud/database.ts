import type { Json } from './json'

/** The two tables from `supabase/migrations`, typed by hand to keep the client honest. */
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
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
