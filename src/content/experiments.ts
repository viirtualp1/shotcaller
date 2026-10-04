import type { StatModifiers } from './modifiers'

/**
 * Optional rules a coach can turn on for matches against the computer. They stay out of duels, career trials and
 * the training ground, so ratings and contracts keep one set of rules.
 */
export interface MatchRules {
  /** Each match uses a different part of the hero pool. */
  readonly rotation?: boolean
  /** Every round is played under a twist both sides know while planning. */
  readonly twists?: boolean
}

/** Heroes of each tier left in the pool when rotation is on. */
export const ROTATION_PER_TIER = 5

export const TWIST_IDS = ['bloodMoon', 'fog', 'siegeTide', 'manaSurge', 'stoneWalls', 'tailwind'] as const

export type TwistId = (typeof TWIST_IDS)[number]

/** What a twist changes for both sides; every field is a multiplier. */
export interface TwistDefinition {
  readonly id: TwistId
  readonly heroes?: Partial<StatModifiers>
  /** Attack range of ranged heroes. */
  readonly rangedReach?: number
  /** Damage creeps deal to buildings. */
  readonly creepSiege?: number
  /** Damage buildings take from anyone. */
  readonly structureDamageTaken?: number
  readonly color: number
}

export const TWISTS: Readonly<Record<TwistId, TwistDefinition>> = {
  bloodMoon: {
    id: 'bloodMoon',
    heroes: { damage: 1.25 },
    color: 0xd9534f,
  },
  fog: {
    id: 'fog',
    rangedReach: 0.75,
    color: 0x9fb4c7,
  },
  siegeTide: {
    id: 'siegeTide',
    creepSiege: 1.6,
    color: 0xd7b98a,
  },
  manaSurge: {
    id: 'manaSurge',
    heroes: { manaGain: 1.5 },
    color: 0x6fb3ff,
  },
  stoneWalls: {
    id: 'stoneWalls',
    structureDamageTaken: 0.7,
    color: 0xa7a08f,
  },
  tailwind: {
    id: 'tailwind',
    heroes: { speed: 1.3 },
    color: 0x7fe0b4,
  },
}
