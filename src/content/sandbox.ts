/** The training ground: any hero and item can be bought, and dummies stand in for the other side. */
export const SANDBOX = {
  /** Gold the wallet shows; buying never lowers it. */
  gold: 99,
  /** A dummy heals back to full whenever it drops below half, so it never falls. */
  dummyHp: 3000,
  dummyRadius: 14,
  maxDummies: 3,
  /** Where dummies stand: this share of the lane from the enemy base, well clear of its tower. */
  dummyAlong: 0.55,
  /** Dummies on one lane stand this far apart across it. */
  dummySpacing: 34,
} as const

export interface SandboxSettings {
  /** Dummies on every lane of the mode. */
  readonly dummies: number
  /** Creep waves on both sides, for testing farm and wave clear. */
  readonly creeps: boolean
}

export const DEFAULT_SANDBOX: SandboxSettings = {
  dummies: 1,
  creeps: false,
}
