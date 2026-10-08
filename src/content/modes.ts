import type { CoachLevel, LaneId, ModeId, TowerSlot } from './ids'

/** What one coach level allows. */
export interface LevelRules {
  /** Heroes allowed on the map. */
  readonly board: number
  /** Chances of a tier 1, 2, 3 and 4 hero in each shop slot. */
  readonly odds: readonly [number, number, number, number]
  /** XP needed for the next level; the top level has no next. */
  readonly xpToNext: number
}

export interface ModeDefinition {
  readonly id: ModeId
  /** Lanes of the board, in the order they are listed. */
  readonly lanes: readonly LaneId[]
  /** Towers each side starts with; the throne always stands behind them. */
  readonly towers: readonly TowerSlot[]
  /** Level 1 first; every coach starts there. */
  readonly levels: readonly LevelRules[]
  readonly maxRounds: number
  readonly baseIncome: number
  /**
   * Building damage a hero kill is worth when a round is judged. On one lane the fights are the game,
   * so a won teamfight takes the round even before it reaches a tower.
   */
  readonly killScore: number
  /** Heal relics on the lane, as on ARAM's bridge. */
  readonly relics: boolean
}

/** Two heroes to begin with, five at the top. */
const LANES_LEVELS: readonly LevelRules[] = [
  {
    board: 2,
    odds: [0.75, 0.25, 0, 0],
    xpToNext: 4,
  },
  {
    board: 3,
    odds: [0.6, 0.32, 0.08, 0],
    xpToNext: 8,
  },
  {
    board: 4,
    odds: [0.4, 0.35, 0.17, 0.08],
    xpToNext: 14,
  },
  {
    board: 5,
    odds: [0.25, 0.3, 0.25, 0.2],
    xpToNext: Infinity,
  },
]

/* One fight needs a team from the start: three heroes at level 1, and the top comes two levels sooner. */
const BRIDGE_LEVELS: readonly LevelRules[] = LANES_LEVELS.slice(1)

/* Three lanes get a sixth hero at the top, two a lane. */
const RIFT_LEVELS: readonly LevelRules[] = [
  ...LANES_LEVELS.slice(0, 2),
  {
    ...LANES_LEVELS[2]!,
    odds: [0.45, 0.38, 0.17, 0],
  },
  {
    ...LANES_LEVELS.at(-1)!,
    odds: [0.3, 0.35, 0.27, 0.08],
    xpToNext: 20,
  },
  {
    board: 6,
    odds: [0.2, 0.3, 0.3, 0.2],
    xpToNext: Infinity,
  },
]

export const MODES: Readonly<Record<ModeId, ModeDefinition>> = {
  threeLanes: {
    id: 'threeLanes',
    lanes: ['top', 'mid', 'bot'],
    towers: ['top', 'mid', 'bot'],
    levels: RIFT_LEVELS,
    maxRounds: 20,
    baseIncome: 5,
    /* A round of fights that never reach the buildings goes to the side that won them, not to a draw. */
    killScore: 30,
    relics: false,
  },
  twoLanes: {
    id: 'twoLanes',
    lanes: ['top', 'bot'],
    towers: ['top', 'bot'],
    levels: LANES_LEVELS,
    maxRounds: 20,
    baseIncome: 5,
    killScore: 30,
    relics: false,
  },
  /* One long fight: a shorter match with more gold, and two towers so a round won is not the whole lane. */
  oneLane: {
    id: 'oneLane',
    lanes: ['mid'],
    towers: ['mid', 'inner'],
    levels: BRIDGE_LEVELS,
    maxRounds: 12,
    baseIncome: 6,
    killScore: 60,
    relics: true,
  },
}

/** The rules of a coach level in a mode; levels past the top read as the top. */
export const levelRules = (mode: ModeId, level: CoachLevel) => {
  const { levels } = MODES[mode]
  return levels[Math.min(Math.max(level, 1), levels.length) - 1]!
}

export const DEFAULT_MODE: ModeId = 'threeLanes'

/** The mode a new player learns on: fewer choices than three lanes, but the lanes still matter. */
export const TUTORIAL_MODE: ModeId = 'twoLanes'
