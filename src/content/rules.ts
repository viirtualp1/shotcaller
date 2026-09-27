import type { CoachLevel, StarLevel, Tier } from './ids'

export const ECONOMY = {
  startGold: 5,
  rerollCost: 2,
  xpCost: 4,
  xpPerPurchase: 4,
  passiveXpPerRound: 1,
  baseIncome: 5,
  goldPerInterest: 10,
  maxInterest: 3,
  creepKillsPerGold: 8,
  maxFarmIncome: 6,
  winBonus: 1,
} as const

export const ROSTER = {
  benchSize: 8,
  shopSize: 5,
  startLevel: 2 as CoachLevel,
  maxLevel: 5 as CoachLevel,
  xpToNext: { 2: 4, 3: 8, 4: 14, 5: Infinity } satisfies Record<CoachLevel, number>,
} as const

export const SHOP_ODDS: Readonly<Record<CoachLevel, readonly [number, number, number]>> = {
  2: [0.75, 0.25, 0],
  3: [0.6, 0.32, 0.08],
  4: [0.45, 0.38, 0.17],
  5: [0.3, 0.4, 0.3],
}

export const POOL_COPIES: Readonly<Record<Tier, number>> = { 1: 12, 2: 9, 3: 6 }
export const STAR_POWER: Readonly<Record<StarLevel, number>> = { 1: 1, 2: 1.8, 3: 3.2 }
export const COPIES_PER_STAR: Readonly<Record<StarLevel, number>> = { 1: 1, 2: 3, 3: 9 }
export const MERGE_COUNT = 3

export type Difficulty = 'relaxed' | 'standard'

/** Planning time limit per difficulty; null means the player starts the fight manually. */
export const DIFFICULTIES: Readonly<Record<Difficulty, { readonly planningSeconds: number | null }>> = {
  relaxed: { planningSeconds: null },
  standard: { planningSeconds: 35 },
}

export const MATCH = {
  maxRounds: 20,
  drawThreshold: 60,
} as const

export const BATTLE = {
  duration: 45,
  step: 1 / 30,
  waveInterval: 10,
  firstWaveAt: 0.6,
  creepSpawnFraction: 0.1,
  towerFraction: 0.3,
  siegeFromRound: 3,
  siegeEveryWaveFromRound: 8,
  creepScalePerRound: 0.07,
  structureScalePerRound: 0.08,
  megaCreepMultiplier: 1.5,
  respawn: { base: 4, perRound: 0.5, max: 12 },
  hero: {
    aggroRange: 190,
    aggroRangeBonus: 60,
    radius: 12,
    structureDamage: 0.6,
    finishStructureBelow: 0.15,
    finishStructureIfHealthAbove: 0.6,
  },
  meleeReach: 6,
  towerSafetyMargin: 14,
  targetLeash: 1.25,
  manaPerAttack: 10,
  manaPerDamageTaken: 40,
  projectileSpeed: { unit: 520, structure: 420 },
  gank: { thinkInterval: 1.2, supportRadius: 320, hpThreshold: 0.5, minOwnHealth: 0.35 },
  auraInterval: 1,
  worldSize: 1000,
} as const
