import { describe, expect, it } from 'vitest'
import { createPrd, prdConstant } from '@/core/random/prd'
import { createRng } from '@/core/random/rng'

const ROLLS = 200_000

/** Proc rate and longest dry streak over many rolls. */
function sample(chance: number, roll: () => boolean) {
  let procs = 0
  let streak = 0
  let longest = 0
  for (let i = 0; i < ROLLS; i++) {
    if (roll()) {
      procs++
      streak = 0
    } else {
      streak++
      longest = Math.max(longest, streak)
    }
  }

  return {
    rate: procs / ROLLS,
    longest,
    chance,
  }
}

describe('pseudo-random distribution', () => {
  it('matches the constants Dota uses', () => {
    expect(prdConstant(0.1)).toBeCloseTo(0.014746, 5)
    expect(prdConstant(0.2)).toBeCloseTo(0.055704, 5)
    expect(prdConstant(0.25)).toBeCloseTo(0.084744, 5)
    expect(prdConstant(0.3)).toBeCloseTo(0.118949, 5)
  })

  it('procs at the nominal rate on average', () => {
    for (const chance of [0.15, 0.2, 0.35]) {
      const prd = createPrd(createRng(`rate-${chance}`), chance)
      expect(sample(chance, prd.roll).rate).toBeCloseTo(chance, 2)
    }
  })

  it('never goes longer without a proc than the distribution allows', () => {
    const chance = 0.2
    const prd = createPrd(createRng('streak'), chance)
    const cap = Math.ceil(1 / prdConstant(chance))
    expect(sample(chance, prd.roll).longest).toBeLessThan(cap)

    const rng = createRng('streak')
    expect(sample(chance, () => rng.chance(chance)).longest).toBeGreaterThan(cap)
  })

  it('handles certain and impossible chances', () => {
    const rng = createRng('edges')
    const never = createPrd(rng, 0)
    const always = createPrd(rng, 1)
    for (let i = 0; i < 100; i++) {
      expect(never.roll()).toBe(false)
      expect(always.roll()).toBe(true)
    }
  })
})
