import { z } from 'zod'
import { HERO_IDS, ITEM_IDS, LANE_IDS, MODE_IDS, SYNERGY_IDS } from '@/content/ids'
import { DEFAULT_MODE } from '@/content/modes'
import { PROFILE } from '@/content/profile'
import { MATCH_END_REASONS } from '@/domain/match/judge'
import { emptyRatings, type Profile } from '@/domain/profile/Profile'

const PROFILE_VERSION = 1

const heroId = z.enum(HERO_IDS)
const synergyId = z.enum(SYNERGY_IDS)
const stars = z.union([z.literal(1), z.literal(2), z.literal(3)])
const amount = z.number().finite().nonnegative()
const count = z.number().int().nonnegative()
const verdict = z.enum(['win', 'loss', 'draw'])

/** The detailed stats came later; profiles saved before read as zero. */
const heroRecord = z.object({
  matches: count,
  wins: count,
  kills: count,
  deaths: count,
  damage: amount,
  bestStars: stars,
  detailed: count.default(0),
  healing: amount.default(0),
  structureDamage: amount.default(0),
  damageReceived: amount.default(0),
})

const lineupHero = z.object({
  heroId,
  stars,
  lane: z.enum(LANE_IDS),
  items: z.array(z.enum(ITEM_IDS)),
})

const heroLine = z.object({
  heroId,
  stars,
  kills: count,
  deaths: count,
  damage: amount,
  healing: amount.default(0),
  structureDamage: amount.default(0),
  damageReceived: amount.default(0),
  rounds: count.default(0),
  lastHits: count.default(0),
})

const synergyRecord = z.object({
  matches: count,
  wins: count,
})

const pair = <T extends z.ZodType>(schema: T) => z.tuple([schema, schema]).readonly()

/** A hero as it fought one round: id, stars, lane and items. */
const roundPick = z
  .tuple([heroId, stars, z.enum(LANE_IDS), z.array(z.enum(ITEM_IDS)).max(2).readonly()])
  .readonly()

const matchRecord = z.object({
  id: z.string().min(1),
  playedAt: z.iso.datetime(),
  /** Matches played before game modes were all three lanes. */
  mode: z.enum(MODE_IDS).default(DEFAULT_MODE),
  difficulty: z.enum(['relaxed', 'standard']),
  verdict,
  reason: z.enum(MATCH_END_REASONS),
  rounds: count,
  roundsWon: count,
  roundsLost: count,
  lineup: z.array(lineupHero),
  synergies: z.array(synergyId),
  heroes: z.array(heroLine),
  /** Added with match details; older records have none. */
  opponentLineup: z.array(lineupHero).default([]),
  opponentSynergies: z.array(synergyId).default([]),
  opponentHeroes: z.array(heroLine).default([]),
  history: z.array(verdict).default([]),
  /** Only the latest matches keep every round. */
  roundLineups: z
    .array(pair(z.array(roundPick).readonly()))
    .max(40)
    .default([]),
  mvp: heroId.nullable(),
  duel: z
    .object({ opponentName: z.string().max(64) })
    .nullable()
    .default(null),
  /** Added with cloud saves; older records fall back to zero. */
  heroKills: count.default(0),
  towersDestroyed: count,
  goldEarned: amount,
  ratingBefore: amount,
  ratingAfter: amount,
  xp: amount,
})

const modeRatings = z.object({
  threeLanes: amount,
  twoLanes: amount,
  oneLane: amount,
})

const profile = z.object({
  name: z.string().max(PROFILE.nameMaxLength),
  avatar: heroId.nullable(),
  createdAt: z.iso.datetime(),
  ratings: modeRatings.optional(),
  peakRatings: modeRatings.optional(),
  rating: amount,
  peakRating: amount,
  xp: amount,
  totals: z.object({
    matches: count,
    wins: count,
    losses: count,
    draws: count,
    throneWins: count,
    roundsPlayed: count,
    heroKills: count,
    streak: z.number().int(),
    bestWinStreak: count,
    fastestWin: count.nullable(),
  }),
  heroes: z.partialRecord(heroId, heroRecord),
  synergies: z.partialRecord(synergyId, synergyRecord),
  recent: z.array(matchRecord).max(PROFILE.recentMatches),
})

/* Before game modes there was one rating, earned on three lanes. */
const migratedProfile = profile.transform(({ ratings, peakRatings, ...rest }) => ({
  ...rest,
  ratings: ratings ?? {
    ...emptyRatings(),
    threeLanes: rest.rating,
  },
  peakRatings: peakRatings ?? {
    ...emptyRatings(),
    threeLanes: rest.peakRating,
  },
}))

const envelope = z.object({
  version: z.literal(PROFILE_VERSION),
  profile: migratedProfile,
})

/** The profile as stored locally and in the cloud: versioned, so a newer game can migrate it. */
export const toProfileEnvelope = (value: Profile) => ({
  version: PROFILE_VERSION,
  profile: value,
})

/** Returns null for anything that is not a profile this version of the game can read. */
export function fromProfileEnvelope(json: unknown): Profile | null {
  const parsed = envelope.safeParse(json)
  return parsed.success ? parsed.data.profile : null
}

export const matchRecordSchema = matchRecord

export const serializeProfile = (value: Profile) => JSON.stringify(toProfileEnvelope(value))

export function parseProfile(raw: string): Profile | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }

  return fromProfileEnvelope(json)
}
