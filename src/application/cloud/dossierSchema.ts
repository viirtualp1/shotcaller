import { FRAME_IDS, TITLE_IDS } from '@/content/progression'
import { z } from 'zod'
import {
  HERO_IDS,
  ITEM_IDS,
  LANE_IDS,
  MODE_IDS,
  SYNERGY_IDS,
  type HeroId,
  type SynergyId,
} from '@/content/ids'
import { DEFAULT_MODE } from '@/content/modes'
import { MATCH_END_REASONS } from '@/domain/match/judge'
import type { HeroRecord, SynergyRecord } from '@/domain/profile/Profile'
import type { CoachDossier } from '../social/friends'
import { heroRecordSchema, matchRecordSchema, synergyRecordSchema } from '../persistence/profileSnapshot'
import { coachPhoto } from '../social/friends'
import { modeRatingsSchema } from './ratingsSchema'

const count = z.int().nonnegative()
const heroId = z.enum(HERO_IDS)
const stars = z.union([z.literal(1), z.literal(2), z.literal(3)])

/** Keeps the entries a record names by known ids; a hero or synergy added later is skipped by older clients. */
function knownRecord<Id extends string, T>(ids: readonly Id[], schema: z.ZodType<T>) {
  return z
    .record(z.string(), z.unknown())
    .catch({})
    .transform((raw) => {
      const known: Partial<Record<Id, T>> = {}
      for (const id of ids) {
        const parsed = schema.safeParse(raw[id])
        if (parsed.success) {
          known[id] = parsed.data
        }
      }

      return known
    })
}

const summaryHero = z.object({
  heroId,
  stars,
  /** Missing on matches recorded before lanes and items were kept. */
  lane: z.enum(LANE_IDS).nullable().catch(null).default(null),
  items: z.array(z.enum(ITEM_IDS)).max(6).catch([]).default([]),
})

const totals = z.object({
  matches: count,
  wins: count,
  losses: count,
  draws: count,
  throneWins: count.catch(0).default(0),
  roundsPlayed: count.catch(0).default(0),
  heroKills: count.catch(0).default(0),
  streak: z.int().catch(0).default(0),
  bestWinStreak: count.catch(0).default(0),
  fastestWin: count.nullable().catch(null).default(null),
})

/** Coaches' profiles come from their own devices, so everything is checked and anything odd falls back. */
export const coachDossierSchema = z
  .object({
    frame: z.enum(FRAME_IDS).nullable().catch(null),
    title: z.enum(TITLE_IDS).nullable().catch(null),
    id: z.uuid(),
    name: z.string().max(40),
    avatar: z.string().max(32).nullable(),
    photo: z
      .string()
      .max(2048)
      .nullable()
      .catch(null)
      .transform((url) => coachPhoto(url)),
    rating: count,
    /** Missing before game modes, or before the coach saved a profile with them. */
    ratings: modeRatingsSchema.nullable().catch(null),
    peakRating: count.catch(0),
    xp: count.catch(0),
    totals: totals.nullable().catch(null),
    /** Missing from servers before dossiers. */
    heroes: knownRecord<HeroId, HeroRecord>(HERO_IDS, heroRecordSchema).default({}),
    synergies: knownRecord<SynergyId, SynergyRecord>(SYNERGY_IDS, synergyRecordSchema).default({}),
    recent: z
      .array(
        z.object({
          id: z.string().max(64),
          playedAt: z.string(),
          mode: z.enum(MODE_IDS).catch(DEFAULT_MODE),
          duel: z.boolean().catch(false),
          difficulty: z.enum(['relaxed', 'standard', 'hard']).catch('standard'),
          verdict: z.enum(['win', 'loss', 'draw']),
          reason: z.enum(MATCH_END_REASONS).nullable().catch(null).default(null),
          rounds: count,
          roundsWon: count,
          roundsLost: count,
          lineup: z.array(summaryHero).max(10),
          synergies: z.array(z.enum(SYNERGY_IDS)).max(16).catch([]).default([]),
          mvp: heroId.nullable().catch(null),
          heroKills: count.catch(0).default(0),
          towersDestroyed: count.catch(0).default(0),
          ratingBefore: count,
          ratingAfter: count,
          xp: count.catch(0),
        }),
      )
      .max(10)
      .catch([]),
  })
  /* Before game modes there was one rating, earned on three lanes. */
  .transform(({ ratings, ...rest }): CoachDossier => ({
    ...rest,
    ratings: ratings ?? {
      threeLanes: rest.rating,
      twoLanes: 0,
      oneLane: 0,
    },
  }))

/** The server tells only whether it was a duel; the opponent's name stays with the coach. */
export const dossierMatchSchema = matchRecordSchema
  .extend({ duel: z.boolean().catch(false) })
  .transform(({ duel, ...rest }) => ({
    ...rest,
    duel: duel ? { opponentName: null } : null,
  }))
