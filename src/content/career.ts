import type { ModeId } from './ids'

export const TRIAL_IDS = ['siege', 'synergy', 'arsenal', 'threeFronts'] as const
export type TrialId = (typeof TRIAL_IDS)[number]

export interface TrialDefinition {
  readonly id: TrialId
  readonly level: number
  readonly mode: ModeId
  readonly xp: number
}

/** Optional solo objectives. Account progression never changes the rules of a duel. */
export const TRIALS: readonly TrialDefinition[] = [
  {
    id: 'siege',
    level: 2,
    mode: 'twoLanes',
    xp: 150,
  },
  {
    id: 'synergy',
    level: 4,
    mode: 'twoLanes',
    xp: 200,
  },
  {
    id: 'arsenal',
    level: 6,
    mode: 'oneLane',
    xp: 250,
  },
  {
    id: 'threeFronts',
    level: 8,
    mode: 'threeLanes',
    xp: 300,
  },
]

export const trialById = (id: TrialId) => TRIALS.find((trial) => trial.id === id)!

export const ACHIEVEMENT_IDS = ['regular', 'throneBreaker', 'explorer', 'strategist', 'threeStar'] as const
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number]

export const ACHIEVEMENTS: readonly {
  readonly id: AchievementId
  readonly target: number
  readonly xp: number
}[] = [
  {
    id: 'regular',
    target: 5,
    xp: 100,
  },
  {
    id: 'throneBreaker',
    target: 3,
    xp: 150,
  },
  {
    id: 'explorer',
    target: 10,
    xp: 150,
  },
  {
    id: 'strategist',
    target: 4,
    xp: 200,
  },
  {
    id: 'threeStar',
    target: 1,
    xp: 200,
  },
]

export const CONTRACT_IDS = ['matches', 'rounds', 'towers', 'kills', 'synergies', 'upgrades'] as const
export type ContractId = (typeof CONTRACT_IDS)[number]

export interface ContractDefinition {
  readonly id: ContractId
  readonly target: number
  readonly xp: number
}

export const CONTRACTS: Readonly<Record<ContractId, ContractDefinition>> = {
  matches: {
    id: 'matches',
    target: 4,
    xp: 120,
  },
  rounds: {
    id: 'rounds',
    target: 18,
    xp: 120,
  },
  towers: {
    id: 'towers',
    target: 6,
    xp: 120,
  },
  kills: {
    id: 'kills',
    target: 40,
    xp: 120,
  },
  synergies: {
    id: 'synergies',
    target: 3,
    xp: 120,
  },
  upgrades: {
    id: 'upgrades',
    target: 3,
    xp: 120,
  },
}
