import type { SupabaseClient } from '@supabase/supabase-js'
import { FRAME_IDS, TITLE_IDS } from '@/content/progression'
import { z } from 'zod'
import type { ModeId } from '@/content/ids'
import { coachPhoto } from '../social/friends'
import type { LeaderboardService } from '../social/leaderboard'
import type { Database } from './database'
import { coachDossierSchema, dossierMatchSchema } from './dossierSchema'

const entry = z.object({
  frame: z.enum(FRAME_IDS).nullable().catch(null),
  title: z.enum(TITLE_IDS).nullable().catch(null),
  id: z.uuid(),
  position: z.int().positive(),
  name: z.string().max(40),
  avatar: z.string().max(32).nullable(),
  photo: z.string().max(2048).nullable().catch(null).transform(coachPhoto),
  rating: z.int().nonnegative(),
  /** Missing from servers before dossiers; their lookup then answers for itself. */
  open: z.boolean().catch(true).default(true),
})

/** Bounded public RPCs: standings, and the dossiers of open ranked profiles. */
export class SupabaseLeaderboard implements LeaderboardService {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async read(mode: ModeId) {
    const { data, error } = await this.client.rpc('mmr_leaderboard', { game_mode: mode })
    if (error) {
      throw error
    }

    return z.array(entry).max(100).parse(data)
  }

  async profile(coachId: string) {
    const { data, error } = await this.client.rpc('public_coach_profile', { coach: coachId })
    if (error) {
      throw error
    }

    const parsed = coachDossierSchema.safeParse(data)

    return parsed.success ? parsed.data : null
  }

  async match(coachId: string, matchId: string) {
    const { data, error } = await this.client.rpc('public_coach_match', {
      coach: coachId,
      match_id: matchId,
    })

    if (error) {
      throw error
    }

    const parsed = dossierMatchSchema.safeParse(data)

    return parsed.success ? parsed.data : null
  }
}
