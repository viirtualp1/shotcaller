import { z } from 'zod'
import { HERO_IDS, ITEM_IDS, LANE_IDS, SYNERGY_IDS } from '@/content/ids'
import { PROFILE } from '@/content/profile'
import type { Profile } from '@/domain/profile/Profile'

const PROFILE_VERSION = 1

const heroId = z.enum(HERO_IDS)
const synergyId = z.enum(SYNERGY_IDS)
const stars = z.union([z.literal(1), z.literal(2), z.literal(3)])
const amount = z.number().finite().nonnegative()
const count = z.number().int().nonnegative()
const verdict = z.enum(['win', 'loss', 'draw'])

const heroRecord = z.object({
  matches: count,
  wins: count,
  kills: count,
  deaths: count,
  damage: amount,
  bestStars: stars,
})

const synergyRecord = z.object({
  matches: count,
  wins: count,
})

const matchRecord = z.object({
  id: z.string().min(1),
  playedAt: z.iso.datetime(),
  difficulty: z.enum(['relaxed', 'standard']),
  verdict,
  reason: z.enum(['throne', 'roundLimit']),
  rounds: count,
  roundsWon: count,
  roundsLost: count,
  lineup: z.array(
    z.object({
      heroId,
      stars,
      lane: z.enum(LANE_IDS),
      items: z.array(z.enum(ITEM_IDS)),
    }),
  ),
  synergies: z.array(synergyId),
  heroes: z.array(
    z.object({
      heroId,
      stars,
      kills: count,
      deaths: count,
      damage: amount,
    }),
  ),
  mvp: heroId.nullable(),
  towersDestroyed: count,
  goldEarned: amount,
  ratingBefore: amount,
  ratingAfter: amount,
  xp: amount,
})

const profile = z.object({
  name: z.string().max(PROFILE.nameMaxLength),
  avatar: heroId.nullable(),
  createdAt: z.iso.datetime(),
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

const envelope = z.object({
  version: z.literal(PROFILE_VERSION),
  profile,
})

export const serializeProfile = (value: Profile) =>
  JSON.stringify({
    version: PROFILE_VERSION,
    profile: value,
  })

/** Returns null for anything that is not a profile this version of the game can read. */
export function parseProfile(raw: string): Profile | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }

  const parsed = envelope.safeParse(json)
  return parsed.success ? parsed.data.profile : null
}
