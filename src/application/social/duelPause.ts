import type { TeamId } from '@/content/ids'
import { DUEL_PAUSE } from '@/content/rules'
import type { DuelPause } from './duels'

/**
 * Timing of the shared duel pause, measured on this device's clock: the server's timestamps would carry the
 * difference between the two clocks into every countdown. The server enforces the same rules on its own clock.
 */

const secondsBetween = (fromMs: number, toMs: number) => Math.max(0, (toMs - fromMs) / 1000)

export const pausesLeft = (pause: DuelPause, side: TeamId) =>
  Math.max(0, DUEL_PAUSE.perCoach - pause.used[side])

/** Seconds until this coach may pause again after their last pause; 0 when they may. */
export function cooldownLeft(lastPauseMs: number | null, nowMs: number) {
  if (lastPauseMs === null) {
    return 0
  }

  return Math.ceil(Math.max(0, DUEL_PAUSE.cooldownSeconds - secondsBetween(lastPauseMs, nowMs)))
}

/** Seconds until a coach may resume a pause that began at `pausedAtMs`: at once for its author. */
export function resumeLeft(pausedAtMs: number, nowMs: number, mine: boolean) {
  return mine ? 0 : Math.ceil(Math.max(0, DUEL_PAUSE.resumeAfterSeconds - secondsBetween(pausedAtMs, nowMs)))
}

/** Seconds until the pause ends on its own. */
export const pauseEndsIn = (pausedAtMs: number, nowMs: number) =>
  Math.ceil(Math.max(0, DUEL_PAUSE.maxSeconds - secondsBetween(pausedAtMs, nowMs)))
