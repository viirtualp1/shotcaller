import { describe, expect, it } from 'vitest'
import type { HeroId, LaneId, ModeId } from '@/content/ids'
import { MODES } from '@/content/modes'
import { BATTLE } from '@/content/rules'
import { SANDBOX } from '@/content/sandbox'
import { distance } from '@/core/math/vec2'
import { freshStructures } from '@/domain/match/structures'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import type { SimulationContext } from '@/simulation/SimulationContext'

function trainingFight(
  mode: ModeId,
  heroes: Partial<Record<LaneId, HeroId>>,
  creeps = false,
  endless = false,
  dummies = 2,
) {
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
      dummies,
      creeps,
      endless,
    },
  })
}

const dummiesOf = (simulation: BattleSimulation) => simulation.world.entities.filter((e) => e.dummy)

describe('training ground', () => {
  it.each(['sniper', 'rogue'] as const)('lets %s attack a tower with no dummies or creeps', (heroId) => {
    const simulation = trainingFight('threeLanes', { mid: heroId }, false, true, 0)
    const hero = simulation.queries.heroes.entities[0]!

    const tower = simulation.queries.structures.entities.find(
      (unit) => unit.team === 1 && unit.structure.slot === 'mid',
    )!

    const path = hero.laneFollower!.path
    hero.position = simulation.map.pointAt(path, simulation.map.project(path, tower.position).along - 190)
    const before = tower.health.current

    for (let i = 0; i < 360; i++) {
      simulation.step()
    }

    expect(tower.health.current).toBeLessThan(before)
    expect(hero.hero.structureDamage).toBeGreaterThan(0)
  })

  it.each(['threeLanes', 'twoLanes', 'oneLane'] as const)(
    'stands the dummies of %s out of reach of every tower, theirs and ours',
    (mode) => {
      const simulation = trainingFight(mode, {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (simulation as any).ctx as SimulationContext

      expect(dummiesOf(simulation)).toHaveLength(MODES[mode].lanes.length)

      for (const dummy of dummiesOf(simulation)) {
        expect(ctx.safety.isUnsafe(0, dummy.position)).toBe(false)

        for (const structure of simulation.world.entities.filter((e) => e.structure)) {
          const gap = distance(dummy.position, structure.position) - structure.radius! - dummy.radius!
          expect(gap).toBeGreaterThan(structure.attack!.range)
        }
      }
    },
  )

  it('takes every hit in full and never falls, with no creeps unless asked for', { timeout: 15000 }, () => {
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

  it(
    'runs on past the round clock without one, and stops where it is when played out',
    { timeout: 15000 },
    () => {
      const simulation = trainingFight('twoLanes', { top: 'archer' }, false, true)

      for (let i = 0; i < Math.ceil(BATTLE.duration / BATTLE.step) + 30; i++) {
        simulation.step()
      }

      expect(simulation.elapsed).toBeGreaterThan(BATTLE.duration)
      expect(simulation.isOver).toBe(false)

      const at = simulation.elapsed
      expect(simulation.runToEnd().heroes[0]?.damageDealt).toBeGreaterThan(0)
      expect(simulation.elapsed).toBe(at)
    },
  )

  it('sends creep waves when asked for', () => {
    const simulation = trainingFight('twoLanes', { top: 'archer' }, true)

    for (let i = 0; i < 90; i++) {
      simulation.step()
    }

    expect(simulation.world.entities.some((e) => e.creep)).toBe(true)
  })

  it.each(['threeLanes', 'twoLanes', 'oneLane'] as const)(
    'keeps the %s camps off creep paths and preserves them on the bridge',
    { timeout: 15000 },
    (mode) => {
      const heroes = Object.fromEntries(MODES[mode].lanes.map((lane) => [lane, 'archer']))
      const simulation = trainingFight(mode, heroes, true, true)
      const before = dummiesOf(simulation).map((dummy) => ({ ...dummy.position }))

      for (const dummy of dummiesOf(simulation)) {
        const path = simulation.map.path(0, dummy.dummyLane!)
        expect(simulation.map.project(path, dummy.position).distance).toBeGreaterThan(100)
      }

      for (let i = 0; i < 900; i++) {
        simulation.step()
      }

      expect(dummiesOf(simulation).map((dummy) => dummy.position)).toEqual(before)

      for (const hero of simulation.queries.heroes) {
        expect(hero.hero.damageDealt).toBeGreaterThan(0)
        expect(hero.targeting.target?.dummyLane).toBe(hero.hero.lane)
      }

      expect(
        simulation.queries.units.entities
          .filter((unit) => unit.creep)
          .every((unit) => !unit.targeting?.target?.dummy),
      ).toBe(true)

      simulation.dispose()
    },
  )

  it(
    'switches one lane live, keeps its combat state, and can return to its own camp',
    { timeout: 15000 },
    () => {
      const simulation = trainingFight(
        'twoLanes',
        {
          top: 'archer',
          bot: 'shaman',
        },
        false,
        true,
      )

      for (let i = 0; i < 900; i++) {
        simulation.step()
      }

      const top = simulation.queries.heroes.entities.find((hero) => hero.hero.lane === 'top')!
      const bottom = simulation.queries.heroes.entities.find((hero) => hero.hero.lane === 'bot')!

      const state = {
        hp: top.health.current,
        mana: top.mana.current,
        damage: top.hero.damageDealt,
        elapsed: simulation.elapsed,
      }

      expect(simulation.setSandboxGoal('top', 'push')).toBe(true)
      expect(top.training?.goal).toBe('push')
      expect(bottom.training?.goal).toBe('dummies')

      expect({
        hp: top.health.current,
        mana: top.mana.current,
        damage: top.hero.damageDealt,
        elapsed: simulation.elapsed,
      }).toEqual(state)

      expect(top.targeting.target).toBeNull()

      for (let i = 0; i < 600; i++) {
        simulation.step()
      }

      expect(top.hero.structureDamage).toBeGreaterThan(0)
      expect(top.targeting.target?.dummy).not.toBe(true)
      expect(simulation.setSandboxGoal('top', 'dummies')).toBe(true)

      for (let i = 0; i < 600; i++) {
        simulation.step()
      }

      expect(top.targeting.target?.dummyLane).toBe('top')
      expect(top.hero.damageDealt).toBeGreaterThan(state.damage)
      simulation.dispose()
    },
  )

  it('does not let lane combat or another camp feed dummy damage, including splash', () => {
    const simulation = trainingFight(
      'twoLanes',
      {
        top: 'pyromancer',
        bot: 'necromancer',
      },
      true,
      true,
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (simulation as any).ctx as SimulationContext
    const caster = simulation.queries.heroes.entities.find((hero) => hero.hero.lane === 'top')!
    const otherDummy = simulation.queries.units.entities.find((unit) => unit.dummyLane === 'bot')!
    const ownDummy = simulation.queries.units.entities.find((unit) => unit.dummyLane === 'top')!
    expect(ctx.combat.dealDamage(caster, otherDummy, 100, 'magical')).toBe(0)
    expect(ctx.combat.dealDamage(caster, ownDummy, 100, 'magical')).toBe(100)

    simulation.setSandboxGoal('top', 'push')
    expect(ctx.combat.dealDamage(caster, ownDummy, 100, 'magical')).toBe(0)
    expect(simulation.setSandboxGoal('mid', 'push')).toBe(false)
    simulation.dispose()
  })
})
