import { z } from 'zod'
import { BATTLE } from '@/content/rules'
import type { LiveMatch } from '@/domain/replay/live'
import { matchRecordSchema } from '../persistence/profileSnapshot'

export const LIVE_MATCH_INTERVAL = 3000

export const liveMatchSchema = z.object({
  record: matchRecordSchema,
  round: z.int().min(1).max(40),
  phase: z.enum(['planning', 'battle', 'summary', 'finished']),
  elapsed: z
    .number()
    .nonnegative()
    .max(BATTLE.duration + BATTLE.step),
})

export type { LiveMatch }
