import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { ModeId } from '@/content/ids'
import { coachPhoto } from '../social/friends'
import type { LeaderboardService } from '../social/leaderboard'
import type { Database } from './database'

const entry = z.object({
  id: z.uuid(),
  position: z.int().positive(),
  name: z.string().max(40),
  avatar: z.string().max(32).nullable(),
  photo: z.string().max(2048).nullable().catch(null).transform(coachPhoto),
  rating: z.int().nonnegative(),
})

/** A bounded public RPC, independent of friends' private profiles. */
export class SupabaseLeaderboard implements LeaderboardService {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async read(mode: ModeId) {
    const { data, error } = await this.client.rpc('mmr_leaderboard', { game_mode: mode })
    if (error) {
      throw error
    }

    return z.array(entry).max(100).parse(data)
  }
}
