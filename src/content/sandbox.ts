import type { LaneId, ModeId } from './ids'
import type { Point } from './map'

export type SandboxGoal = 'dummies' | 'push'

/** The training ground: any hero and item can be bought, and dummies stand in for the other side. */
export const SANDBOX = {
  /** Gold the wallet shows; buying never lowers it. */
  gold: 99,
  /** A dummy heals back to full whenever it drops below half, so it never falls. */
  dummyHp: 3000,
  dummyRadius: 14,
  maxDummies: 1,
  /** Dummies stand this far apart inside their lane's practice camp. */
  dummySpacing: 34,
  campRadius: 72,
} as const

/** Side camps sit away from creep paths and tower fire. The bridge gets an adjoining practice platform. */
export const TRAINING_CAMPS: Readonly<Record<ModeId, Partial<Record<LaneId, Point>>>> = {
  threeLanes: {
    top: [285, 265],
    mid: [425, 375],
    bot: [735, 715],
  },
  twoLanes: {
    top: [430, 380],
    bot: [570, 620],
  },
  oneLane: { mid: [355, 395] },
}

export interface SandboxSettings {
  /** Dummies on every lane of the mode. */
  readonly dummies: number
  /** Creep waves on both sides, for testing farm and wave clear. */
  readonly creeps: boolean
  /** No clock and no rounds: a battle runs until the coach stops it, and can be paused at any moment. */
  readonly endless: boolean
  /** Each lane can practice in its side camp or push, including during battle. */
  readonly goals?: Readonly<Partial<Record<LaneId, SandboxGoal>>>
}

export function sandboxGoal(settings: SandboxSettings, lane: LaneId): SandboxGoal {
  return settings.dummies > 0 ? (settings.goals?.[lane] ?? 'dummies') : 'push'
}

export const DEFAULT_SANDBOX: SandboxSettings = {
  dummies: 1,
  creeps: false,
  endless: true,
}
