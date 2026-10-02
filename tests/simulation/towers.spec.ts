import { describe, expect, it } from 'vitest'
import type { ModeId } from '@/content/ids'
import { MODES } from '@/content/modes'
import type { CreepVariant } from '@/content/units'
import { freshStructures } from '@/domain/match/structures'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import type { SimulationContext } from '@/simulation/SimulationContext'
import { CollisionSystem } from '@/simulation/systems/CollisionSystem'
import { MovementSystem } from '@/simulation/systems/MovementSystem'
import { TargetingSystem } from '@/simulation/systems/TargetingSystem'

function arena(mode: ModeId) {
  const simulation = new BattleSimulation({
    mode,
    round: 1,
    seed: 'tower-rules',
    lineups: [
      {
        top: [],
        mid: [],
        bot: [],
      },
      {
        top: [],
        mid: [],
        bot: [],
      },
    ],
    structures: [freshStructures(mode), freshStructures(mode)],
  })

  const ctx = (simulation as unknown as { ctx: SimulationContext }).ctx

  return {
    simulation,
    ctx,
  }
}

describe('tower and throne protection', () => {
  it.each(['threeLanes', 'twoLanes', 'oneLane'] as const)(
    'blocks every kind of throne damage in %s until a whole lane is open',
    (mode) => {
      const { simulation, ctx } = arena(mode)
      const lane = MODES[mode].lanes[0]!

      const source = ctx.factory.creep({
        team: 0,
        lane,
        variant: 'melee',
        along: 0,
        strength: 1,
        damageBonus: 0,
        mega: false,
      })

      const throne = simulation.queries.structures.entities.find(
        (unit) => unit.team === 1 && unit.structure.type === 'throne',
      )!

      const before = throne.health.current
      let damageEvents = 0
      simulation.events.on('structureDamaged', () => damageEvents++)

      expect(ctx.combat.landAttack(source, throne, 500)).toBe(0)
      expect(ctx.combat.dealDamage(source, throne, 500, 'magical')).toBe(0)
      ctx.combat.splash(source, throne.position, 40, 500, 'magical', { includeStructures: true })
      expect(throne.health.current).toBe(before)
      expect(damageEvents).toBe(0)

      const towers = simulation.queries.structures.entities.filter(
        (unit) => unit.team === 1 && unit.structure.lane === lane,
      )

      towers[0]!.health.current = 0

      if (towers.length > 1) {
        expect(ctx.combat.dealDamage(source, throne, 500, 'physical')).toBe(0)
      }

      for (const tower of towers) {
        tower.health.current = 0
      }

      expect(ctx.combat.dealDamage(source, throne, 500, 'physical')).toBeGreaterThan(0)
      expect(damageEvents).toBe(1)
      expect(throne.health.current).toBeLessThan(before)
      simulation.dispose()
    },
  )

  it.each(['melee', 'ranged', 'siege'] satisfies CreepVariant[])(
    '%s creeps clear a defending wave, attack its tower and stay in front of it',
    (variant) => {
      const { simulation, ctx } = arena('oneLane')

      const tower = simulation.queries.structures.entities.find(
        (unit) => unit.team === 1 && unit.structure.slot === 'mid',
      )!

      const path = ctx.map.path(0, 'mid')
      const towerAlong = ctx.map.project(path, tower.position).along

      const creep = ctx.factory.creep({
        team: 0,
        lane: 'mid',
        variant,
        along: towerAlong - 80,
        strength: 1,
        damageBonus: 0,
        mega: false,
      })

      const defender = ctx.factory.creep({
        team: 1,
        lane: 'mid',
        variant: 'melee',
        along: path.length - towerAlong + 20,
        strength: 1,
        damageBonus: 0,
        mega: false,
      })

      const behind = ctx.factory.dummy(1, 'mid', 0, 1)
      Object.assign(behind.position, ctx.map.pointAt(path, towerAlong + 80))
      const targeting = new TargetingSystem(ctx)
      const movement = new MovementSystem(ctx)
      const collision = new CollisionSystem(ctx)
      ctx.index.sync()
      targeting.update(0)
      expect(creep.targeting!.target).toBe(defender)
      ctx.world.remove(defender)
      creep.targeting!.target = behind
      ctx.index.sync()
      targeting.update(0)
      expect(creep.targeting!.target).toBe(tower)

      for (let i = 0; i < 120; i++) {
        movement.update(0.1)
        collision.update()
        expect(ctx.map.project(path, creep.position).along).toBeLessThan(towerAlong - tower.radius)
      }

      // Collisions or a shove cannot push a creep past an intact tower either.
      Object.assign(creep.position, ctx.map.pointAt(path, towerAlong + 30))
      collision.update()
      expect(ctx.map.project(path, creep.position).along).toBeLessThan(towerAlong - tower.radius)

      tower.health.current = 0
      ctx.index.sync()
      targeting.update(0)
      expect(creep.targeting!.target).not.toBe(tower)
      simulation.dispose()
    },
  )
})
