import { describe, expect, it } from 'vitest'
import type { HeroId } from '@/content/ids'
import { LaneOptimizer } from '@/domain/coach/LaneOptimizer'
import { resolveLane } from '@/domain/synergy/resolveLane'

const team = (...ids: HeroId[]) =>
  ids.map((heroId, i) => ({
    uid: `u${i}`,
    heroId,
    stars: 1 as const,
    items: [],
  }))

describe('resolveLane', () => {
  it('activates guardian for a carry with a support', () => {
    const report = resolveLane('bot', ['archer', 'acolyte'], 'threeLanes')
    expect(report.synergies).toEqual(['guardian'])
    expect(report.modifiersFor('carry').attackSpeed).toBeCloseTo(1.35)
    expect(report.modifiersFor('support').attackSpeed).toBe(1)
  })

  it('treats a lone mid hero as solo mid, but only among three lanes', () => {
    expect(resolveLane('mid', ['pyromancer'], 'threeLanes').synergies).toContain('soloMid')
    expect(resolveLane('top', ['pyromancer'], 'threeLanes').synergies).not.toContain('soloMid')
    expect(resolveLane('mid', ['pyromancer'], 'oneLane').synergies).not.toContain('soloMid')
  })
})

describe('LaneOptimizer', () => {
  it('covers every lane before stacking one', () => {
    const lanes = new LaneOptimizer().assign(team('archer', 'acolyte', 'pyromancer'), 'threeLanes')
    expect(new Set(lanes).size).toBe(3)
  })

  it('pairs the carry with the support once lanes are covered', () => {
    const lanes = new LaneOptimizer().assign(team('archer', 'acolyte', 'pyromancer', 'giant'), 'threeLanes')
    expect(lanes[0]).toBe(lanes[1])
    expect(new Set(lanes).size).toBe(3)
  })

  it('spreads a full team over every lane', () => {
    const lanes = new LaneOptimizer().assign(
      team('archer', 'acolyte', 'pyromancer', 'giant', 'shade'),
      'threeLanes',
    )

    expect(new Set(lanes).size).toBe(3)
  })

  it('uses only the lanes of the mode', () => {
    const heroes = team('archer', 'acolyte', 'pyromancer', 'giant')
    expect(new Set(new LaneOptimizer().assign(heroes, 'twoLanes'))).toEqual(new Set(['top', 'bot']))
    expect(new Set(new LaneOptimizer().assign(heroes, 'oneLane'))).toEqual(new Set(['mid']))
  })
})
