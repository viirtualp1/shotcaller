import type { ModeId, StarLevel, Tier } from './ids'

export const ECONOMY = {
  startGold: 5,
  rerollCost: 2,
  xpCost: 4,
  xpPerPurchase: 4,
  passiveXpPerRound: 1,
  goldPerInterest: 10,
  maxInterest: 3,
  creepKillsPerGold: 8,
  maxFarmIncome: 6,
  winBonus: 1,
} as const

export const ROSTER = {
  benchSize: 8,
  shopSize: 5,
} as const

export const POOL_COPIES: Readonly<Record<Tier, number>> = {
  1: 12,
  2: 9,
  3: 6,
}

export const STAR_POWER: Readonly<Record<StarLevel, number>> = {
  1: 1,
  2: 1.8,
  3: 3.2,
}

export const COPIES_PER_STAR: Readonly<Record<StarLevel, number>> = {
  1: 1,
  2: 3,
  3: 9,
}

export const MERGE_COUNT = 3

export type Difficulty = 'relaxed' | 'standard'

/** Online duels always run on the clock: the other player is waiting. */
export const DUEL_PLANNING_SECONDS = 60

/** Both devices play a duel battle at this speed on the wall clock, so neither can run ahead of the other. */
export const DUEL_BATTLE_SPEED = 2

/** Added to a duel's planning time for reading the round summary; the clock starts when the battle ends. */
export const DUEL_SUMMARY_SECONDS = 10

/** Planning time limit per difficulty; null means the player starts the fight manually. */
export const DIFFICULTIES: Readonly<Record<Difficulty, { readonly planningSeconds: number | null }>> = {
  relaxed: { planningSeconds: null },
  standard: { planningSeconds: 60 },
}

/** How the computer opponent spends its gold. */
export interface OpponentStyle {
  /** Before this round the bot only buys heroes it does not own yet, so nobody opens with a promoted hero. */
  readonly copiesFromRound: number
  readonly levelFromRound: number
  readonly goldReserveForXp: number
  readonly rerollFromRound: number
  readonly rerollAboveGold: number
  readonly maxRerolls: number
  /** Heroes kept on top of a full board. */
  readonly spareHeroes: number
  readonly benchLimitOverTeam: number
  readonly itemsFromRound: number
  readonly goldReserveForItems: number
}

/** Relaxed is for learning: the bot never rerolls, levels up late and buys items only in the late game. */
export const OPPONENT: Readonly<Record<Difficulty, OpponentStyle>> = {
  relaxed: {
    copiesFromRound: 3,
    levelFromRound: 9,
    goldReserveForXp: 6,
    rerollFromRound: Infinity,
    rerollAboveGold: Infinity,
    maxRerolls: 0,
    spareHeroes: 0,
    benchLimitOverTeam: 2,
    itemsFromRound: 12,
    goldReserveForItems: 8,
  },
  standard: {
    copiesFromRound: 2,
    levelFromRound: 2,
    goldReserveForXp: 2,
    rerollFromRound: 3,
    rerollAboveGold: 8,
    maxRerolls: 3,
    spareHeroes: 2,
    benchLimitOverTeam: 4,
    itemsFromRound: 3,
    goldReserveForItems: 4,
  },
}

/** The shorter bridge match rewards investing in items and upgrades earlier. No extra gold or stats. */
export function opponentStyleFor(mode: ModeId, difficulty: Difficulty): OpponentStyle {
  const style = OPPONENT[difficulty]
  if (mode !== 'oneLane' || difficulty !== 'standard') {
    return style
  }

  return {
    ...style,
    goldReserveForXp: 1,
    itemsFromRound: 2,
    goldReserveForItems: 2,
    rerollFromRound: 2,
    rerollAboveGold: 6,
  }
}

export const MATCH = {
  drawThreshold: 60,
} as const

/** Heal relics on the one-lane bridge, as on ARAM's Howling Abyss. */
export const RELIC = {
  firstAt: 8,
  cooldown: 16,
  /** How close a hero must come to take one. */
  pickRadius: 22,
  /** Share of max health restored to the hero who takes it and to allies this close. */
  heal: 0.2,
  shareRadius: 150,
  color: 0x7fe0b4,
} as const

export const BATTLE = {
  duration: 45,
  step: 1 / 30,
  waveInterval: 10,
  firstWaveAt: 0.6,
  creepSpawnFraction: 0.1,
  siegeFromRound: 3,
  siegeEveryWaveFromRound: 8,
  creepScalePerRound: 0.07,
  structureScalePerRound: 0.08,
  megaCreepMultiplier: 1.5,
  respawn: {
    base: 4,
    perRound: 0.5,
    max: 12,
  },
  hero: {
    aggroRange: 190,
    aggroRangeBonus: 60,
    radius: 12,
    structureDamage: 0.6,
    finishStructureBelow: 0.15,
    finishStructureIfHealthAbove: 0.6,
    /** Below this health share the enemy throne beats any other target, tower fire or not. */
    finishThroneBelow: 0.1,
    /** Seconds a hero keeps answering the enemy hero that last hit it. */
    retaliationMemory: 2,
    /** Below this health share a hero keeps out of enemy tower range even while creeps tank the tower. */
    towerRetreatHealth: 0.4,
  },
  meleeReach: 6,
  /** Creeps notice enemy heroes from farther away than enemy creeps, so they stop instead of walking past. */
  creepHeroAggro: 200,
  towerSafetyMargin: 14,
  targetLeash: 1.25,
  manaPerAttack: 10,
  manaPerDamageTaken: 40,
  projectileSpeed: {
    unit: 520,
    structure: 420,
  },
  defense: {
    /** Seconds heroes keep guarding the base after the last hit on their throne. */
    alarmSeconds: 4,
    /** Enemies this far beyond the throne's reach still count as attacking the base. */
    radiusBonus: 60,
    /** Defenders with nobody to fight wait this close to the throne. */
    holdDistance: 70,
  },
  /**
   * A hero with no ally hero around weighs up the enemy heroes before taking them on: health left times
   * damage per second on each side.
   */
  skirmish: {
    radius: 260,
    /** The enemy side has to be this many times stronger for a hero to back off. */
    outmatchedAt: 1.4,
    /** Seconds a hero keeps falling back once it decided to, so it does not turn back and forth. */
    retreatSeconds: 1.5,
  },
  /** Lane orders from the coach. */
  stance: {
    /** Under Hold heroes stay within this distance past their own outermost tower. */
    holdMargin: 40,
    /** Under Group no hero walks further than this ahead of the lane-mate furthest behind. */
    groupSpread: 70,
  },
  gank: {
    thinkInterval: 1.2,
    supportRadius: 320,
    hpThreshold: 0.5,
    minOwnHealth: 0.35,
  },
  auraInterval: 1,
  worldSize: 1000,
} as const
