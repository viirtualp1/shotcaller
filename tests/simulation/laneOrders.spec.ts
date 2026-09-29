import { describe, expect, it } from 'vitest'
import type { HeroId, LaneId, LaneStance } from '@/content/ids'
import type { BattleSetup } from '@/domain/battle/contracts'
import { freshStructures } from '@/domain/match/structures'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import { holdLine } from '@/simulation/services/laneOrders'

function lineup(prefix: string, lanes: Partial<Record<LaneId, HeroId[]>>) {
  const build = (lane: LaneId) =>
    (lanes[lane] ?? []).map((heroId, i) => ({
      uid: `${prefix}-${lane}-${i}`,
      heroId,
      stars: 1 as const,
      items: [],
    }))

  return {
    top: build('top'),
    mid: build('mid'),
    bot: build('bot'),
  }
}

function setup(
  seed: string,
  ours: Partial<Record<LaneId, HeroId[]>>,
  theirs: Partial<Record<LaneId, HeroId[]>>,
  midOrder?: LaneStance,
): BattleSetup {
  return {
    mode: 'threeLanes',
    round: 3,
    seed,
    lineups: [lineup('a', ours), lineup('b', theirs)],
    structures: [freshStructures(), freshStructures()],
    stances: midOrder ? [{ mid: midOrder }, {}] : undefined,
  }
}

/** Twenty whole battles take longer than a unit test does while the suite runs in parallel. */
const WHOLE_BATTLES_TIMEOUT = 30_000

const ourHero = (simulation: BattleSimulation, heroId: HeroId) =>
  simulation.queries.heroes.entities.find((h) => h.team === 0 && h.hero.heroId === heroId)!

const alongLane = (simulation: BattleSimulation, hero: ReturnType<typeof ourHero>) =>
  simulation.map.project(hero.laneFollower!.path, hero.position).along

describe('lane orders', () => {
  it(
    'backs a hero caught alone by stronger heroes off when its lane is told to stay together',
    () => {
      const deaths = (order?: LaneStance) => {
        let total = 0

        for (let i = 0; i < 10; i++) {
          const outcome = new BattleSimulation(
            setup(`alone-${i}`, { mid: ['archer'] }, { mid: ['giant', 'blademaster', 'pyromancer'] }, order),
          ).runToEnd()

          total += outcome.heroes.find((h) => h.team === 0)!.deaths
        }

        return total
      }

      expect(deaths('group')).toBeLessThan(deaths())
    },
    WHOLE_BATTLES_TIMEOUT,
  )

  it('fights lanes without an order the same whether any orders were sent or not', () => {
    const lanes = setup('as-before', { mid: ['archer', 'spearman'] }, { mid: ['giant', 'blademaster'] })

    expect(new BattleSimulation(lanes).runToEnd()).toEqual(
      new BattleSimulation({
        ...lanes,
        stances: [{}, {}],
      }).runToEnd(),
    )
  })

  it.each<HeroId>(['pyromancer', 'rogue'])('keeps %s, told to hold, by its own outer tower', (heroId) => {
    const furthest = (order?: LaneStance) => {
      const simulation = new BattleSimulation(setup('hold', { mid: [heroId] }, { top: ['archer'] }, order))
      const hero = ourHero(simulation, heroId)
      let most = 0

      while (!simulation.isOver) {
        simulation.step()
        most = Math.max(most, alongLane(simulation, hero))
      }

      return {
        most,
        line: holdLine(simulation.map, hero),
      }
    }

    const held = furthest('hold')
    expect(held.most).toBeLessThanOrEqual(held.line! + 20)
    expect(furthest().most).toBeGreaterThan(held.line! + 100)
  })

  it('makes a lane told to stay together wait for a fallen lane-mate', () => {
    const walked = (order?: LaneStance) => {
      const simulation = new BattleSimulation(
        setup('together', { mid: ['sniper', 'packLeader'] }, { top: ['archer'] }, order),
      )

      const sniper = ourHero(simulation, 'sniper')
      while (simulation.elapsed < 2) {
        simulation.step()
      }

      ourHero(simulation, 'packLeader').health.current = 0
      const before = alongLane(simulation, sniper)
      while (simulation.elapsed < 6) {
        simulation.step()
      }

      return alongLane(simulation, sniper) - before
    }

    expect(walked('group')).toBeLessThan(10)
    expect(walked()).toBeGreaterThan(200)
  })
})
