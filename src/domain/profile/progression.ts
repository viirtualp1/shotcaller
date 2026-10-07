import { PROFILE_XP, RANK, RANK_TIERS, RATING, type RankTier } from '@/content/profile'
import type { MatchResult } from '../match/judge'

export type Verdict = 'win' | 'loss' | 'draw'

export interface Rank {
  readonly tier: RankTier
  /** 1–5 inside a medal; 0 for the top rank, which has no stars. */
  readonly stars: number
  /** Rating where this star starts. */
  readonly floor: number
  /** Rating of the next star, or `null` at the top. */
  readonly next: number | null
}

const TOP_STAR = (RANK_TIERS.length - 1) * RANK.starsPerTier

export const verdictOf = (result: MatchResult): Verdict =>
  result.winner === null ? 'draw' : result.winner === 0 ? 'win' : 'loss'

export function rankFor(rating: number): Rank {
  const star = Math.floor(Math.max(0, rating) / RANK.pointsPerStar)
  if (star >= TOP_STAR) {
    return {
      tier: RANK_TIERS[RANK_TIERS.length - 1]!,
      stars: 0,
      floor: TOP_STAR * RANK.pointsPerStar,
      next: null,
    }
  }

  return {
    tier: RANK_TIERS[Math.floor(star / RANK.starsPerTier)]!,
    stars: (star % RANK.starsPerTier) + 1,
    floor: star * RANK.pointsPerStar,
    next: (star + 1) * RANK.pointsPerStar,
  }
}

/** Orders ranks so a rank-up is simply a bigger number. */
export const rankStep = (rank: Rank) => RANK_TIERS.indexOf(rank.tier) * RANK.starsPerTier + rank.stars

export function ratingChange(result: MatchResult, mine = 0, theirs = mine) {
  const verdict = verdictOf(result)
  if (verdict === 'draw') {
    return 0
  }

  const expected = 1 / (1 + 10 ** ((theirs - mine) / RATING.scale))

  return verdict === 'win'
    ? Math.max(1, Math.round(RATING.k * (1 - expected)))
    : -Math.max(1, Math.round(RATING.k * expected))
}

/** Ghosts move rating by half; PostgreSQL rounds ties away from zero. */
export function rankedRatingChange(result: MatchResult, mine = 0, theirs = mine, ghost = false) {
  const change = ratingChange(result, mine, theirs)

  return ghost ? Math.sign(change) * Math.round(Math.abs(change) / 2) : change
}

export function matchXp(verdict: Verdict, roundsWon: number) {
  return (
    PROFILE_XP.perMatch + PROFILE_XP.perRoundWon * roundsWon + (verdict === 'win' ? PROFILE_XP.winBonus : 0)
  )
}

const xpToNext = (level: number) => PROFILE_XP.levelBase + PROFILE_XP.levelStep * (level - 1)

/** Account level from total XP, with progress towards the next one. */
export function levelFor(xp: number) {
  let level = 1
  let into = Math.max(0, xp)
  while (into >= xpToNext(level)) {
    into -= xpToNext(level)
    level++
  }

  return {
    level,
    into,
    needed: xpToNext(level),
  }
}
