import type { Difficulty } from './rules'

/** Coach ranks, lowest first. Every rank but the last has five stars, like Dota medals. */
export const RANK_TIERS = [
  'rookie',
  'scout',
  'tactician',
  'strategist',
  'commander',
  'legend',
  'shotcaller',
] as const

export type RankTier = (typeof RANK_TIERS)[number]

export const RANK = {
  starsPerTier: 5,
  /** Rating between two stars. */
  pointsPerStar: 40,
  colors: {
    rookie: 0xb08d6a,
    scout: 0x8fb39a,
    tactician: 0x6cc4c4,
    strategist: 0x6c9cff,
    commander: 0xb89cff,
    legend: 0xf4c55b,
    shotcaller: 0xff7a5c,
  } satisfies Record<RankTier, number>,
} as const

export const RATING = {
  win: 25,
  /** Extra for breaking the enemy throne instead of winning on the round limit. */
  throneBonus: 5,
  loss: 20,
  /** Gains are scaled down on difficulties without the planning timer. */
  gainScale: {
    relaxed: 0.8,
    standard: 1,
  } satisfies Record<Difficulty, number>,
} as const

export const PROFILE_XP = {
  perMatch: 60,
  perRoundWon: 15,
  winBonus: 60,
  /** XP from level N to N + 1 is `base + step × (N − 1)`. */
  levelBase: 200,
  levelStep: 50,
} as const

export const PROFILE = {
  nameMaxLength: 20,
  recentMatches: 20,
} as const
