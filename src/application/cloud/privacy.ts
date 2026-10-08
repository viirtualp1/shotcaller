import { z } from 'zod'
import { LANE_IDS, type HeroId, type LaneId } from '@/content/ids'
import type { MatchRecord } from '@/domain/profile/Profile'
import { resolveLane } from '@/domain/synergy/resolveLane'
import {
  TELEMETRY_POLICY_VERSION,
  telemetrySchema,
  type Telemetry,
} from '../../../supabase/functions/_shared/telemetry.ts'

export type PrivacyChoices = z.infer<typeof privacySchema>

/** Bump alongside the SQL functions and explanation when purposes or data categories change. */
export const PRIVACY_VERSION = TELEMETRY_POLICY_VERSION

export const privacySchema = z.object({
  version: z.int(),
  telemetry: z.boolean(),
  telemetrySince: z.iso.datetime({ offset: true }).nullable(),
})

export { telemetrySchema, type Telemetry } from '../../../supabase/functions/_shared/telemetry.ts'

/** The faction steps a lineup reaches on its lanes, as `legion:2`. */
function factionSteps(picks: readonly { readonly heroId: HeroId; readonly lane: LaneId }[]) {
  return [
    ...new Set(
      LANE_IDS.flatMap((lane) =>
        resolveLane(
          lane,
          picks.filter((pick) => pick.lane === lane).map((pick) => pick.heroId),
          'threeLanes',
        )
          .factions.standings.filter((standing) => standing.tier !== null)
          .map((standing) => `${standing.faction}:${standing.tier}` as const),
      ),
    ),
  ]
}

export function telemetryOf(record: MatchRecord): Telemetry {
  return telemetrySchema.parse({
    schema: 1,
    mode: record.mode,
    kind: record.trialId ? 'trial' : record.duel?.ghost ? 'ghost' : record.duel ? 'duel' : 'ai',
    difficulty: record.difficulty,
    balance: record.balance,
    verdict: record.verdict,
    reason: record.reason,
    rounds: record.rounds,
    lineup: record.lineup,
    synergies: record.synergies,
    factions: factionSteps(record.lineup),
    heroes: record.heroes,
    ratingBand: Math.floor(record.ratingBefore / 200) * 200,
    goldEarned: record.goldEarned,
    towersDestroyed: record.towersDestroyed,
    roundBoards: record.roundLineups.map(([own], i) => ({
      verdict: record.history[i] ?? 'draw',
      lineup: own.map(([heroId, stars, lane, items]) => ({
        heroId,
        stars,
        lane,
        items,
      })),
      factions: factionSteps(
        own.map(([heroId, , lane]) => ({
          heroId,
          lane,
        })),
      ),
      synergies: [
        ...new Set(
          LANE_IDS.flatMap(
            (lane) =>
              resolveLane(
                lane,
                own.filter((p) => p[2] === lane).map((p) => p[0]),
                record.mode,
              ).synergies,
          ),
        ),
      ],
    })),
  })
}
