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
  k: 50,
  scale: 400,
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
  /** Recent matches that keep every round's lineups; older ones keep only the last round, to keep saves small. */
  roundDetailMatches: 5,
} as const
