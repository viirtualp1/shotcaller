import type { Rng } from './rng'

/**
 * Dota-style pseudo-random distribution. The N-th roll since the last proc succeeds with
 * probability C × N, so long lucky and unlucky streaks are rare while the average rate
 * still equals the nominal chance.
 */
export interface Prd {
  readonly chance: number
  roll(): boolean
}

const BISECTION_STEPS = 60
const constants = new Map<number, number>()

/** Average proc rate that the increment `c` produces. */
function rateFor(c: number) {
  let procBefore = 0
  let expectedRolls = 0
  const maxRolls = Math.ceil(1 / c)
  for (let n = 1; n <= maxRolls; n++) {
    const procNow = Math.min(1, n * c) * (1 - procBefore)
    procBefore += procNow
    expectedRolls += n * procNow
  }

  return 1 / expectedRolls
}

/** The increment C whose distribution averages out to `chance`. */
export function prdConstant(chance: number) {
  if (chance <= 0 || chance >= 1) {
    return Math.min(Math.max(chance, 0), 1)
  }

  const cached = constants.get(chance)
  if (cached !== undefined) {
    return cached
  }

  let low = 0
  let high = chance
  for (let i = 0; i < BISECTION_STEPS; i++) {
    const mid = (low + high) / 2
    if (rateFor(mid) > chance) {
      high = mid
    } else {
      low = mid
    }
  }

  const c = (low + high) / 2
  constants.set(chance, c)

  return c
}

export function createPrd(rng: Rng, chance: number): Prd {
  const c = prdConstant(chance)
  let rolls = 0
  return {
    chance,
    roll: () => {
      rolls++

      if (rng.next() < c * rolls) {
        rolls = 0

        return true
      }

      return false
    },
  }
}
