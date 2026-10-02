import { describe, expect, it } from 'vitest'
import type { HeroId, LaneId, ModeId } from '@/content/ids'
import { MODES } from '@/content/modes'
import { SANDBOX } from '@/content/sandbox'
import { freshStructures } from '@/domain/match/structures'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import type { SimulationContext } from '@/simulation/SimulationContext'

function trainingFight(mode: ModeId, heroes: Partial<Record<LaneId, HeroId>>, creeps = false) {
  const lane = (id: LaneId) =>
    heroes[id]
      ? [
          {
            uid: id,
            heroId: heroes[id],
            stars: 1 as const,
            items: [],
          },
        ]
      : []

  return new BattleSimulation({
    mode,
    round: 4,
    seed: `sandbox-${mode}`,
    lineups: [
      {
        top: lane('top'),
        mid: lane('mid'),
        bot: lane('bot'),
      },
      {
        top: [],
        mid: [],
        bot: [],
      },
    ],
    structures: [freshStructures(mode), freshStructures(mode)],
    sandbox: {
      dummies: 2,
      creeps,
    },
  })
}

const dummiesOf = (simulation: BattleSimulation) => simulation.world.entities.filter((e) => e.dummy)

describe('training ground', () => {
  it.each(['threeLanes', 'twoLanes', 'oneLane'] as const)(
    'stands the dummies of %s out of reach of every enemy tower',
    (mode) => {
      const simulation = trainingFight(mode, {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (simulation as any).ctx as SimulationContext

      expect(dummiesOf(simulation)).toHaveLength(MODES[mode].lanes.length * 2)

      for (const dummy of dummiesOf(simulation)) {
        expect(ctx.safety.isUnsafe(0, dummy.position)).toBe(false)
      }
    },
  )

  it('takes every hit in full and never falls, with no creeps unless asked for', () => {
    // Hook and Assassinate only aim at heroes: the dummies have to count as heroes for them.
    const simulation = trainingFight('threeLanes', {
      top: 'butcher',
      mid: 'pyromancer',
      bot: 'sniper',
    })

    simulation.runToEnd()

    expect(simulation.world.entities.some((e) => e.creep)).toBe(false)
    expect(dummiesOf(simulation).every((dummy) => dummy.health!.current > SANDBOX.dummyHp / 2)).toBe(true)

    const outcome = simulation.runToEnd()
    for (const hero of outcome.heroes) {
      expect(hero.damageDealt).toBeGreaterThan(0)
    }
  })

  it('sends creep waves when asked for', () => {
    const simulation = trainingFight('twoLanes', { top: 'archer' }, true)

    for (let i = 0; i < 90; i++) {
      simulation.step()
    }

    expect(simulation.world.entities.some((e) => e.creep)).toBe(true)
  })
})
