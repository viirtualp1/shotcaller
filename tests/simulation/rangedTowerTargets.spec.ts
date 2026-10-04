import { describe, expect, it } from 'vitest'
import { BATTLE } from '@/content/rules'
import { AttackSystem, inReach } from '@/simulation/systems/AttackSystem'
import { MovementSystem } from '@/simulation/systems/MovementSystem'
import { TargetingSystem } from '@/simulation/systems/TargetingSystem'
import { arena } from '../helpers/battle'

describe('ranged targets beside an enemy tower', () => {
  it.each(['threeLanes', 'twoLanes', 'oneLane'] as const)(
    'lets a pyromancer farm from safety after its hero target dies in %s',
    (mode) => {
      const lane = mode === 'twoLanes' ? 'top' : 'mid'

      const { simulation, ctx, hero, structure } = arena({
        mode,
        ours: {
          [lane]: [
            {
              uid: 'mage',
              heroId: 'pyromancer',
            },
          ],
        },
        theirs: {
          [lane]: [
            {
              uid: 'enemy',
              heroId: 'spearman',
            },
          ],
        },
      })

      const mage = hero('mage')
      const enemy = hero('enemy')
      const tower = structure(1, lane)
      const path = ctx.map.path(0, lane)
      const towerAlong = ctx.map.project(path, tower.position).along

      const safeAlong =
        towerAlong - tower.attack!.range - tower.radius - mage.radius - BATTLE.towerSafetyMargin - 50

      Object.assign(mage.position, ctx.map.pointAt(path, safeAlong))
      enemy.health.current = 0
      mage.targeting.target = enemy
      mage.targeting.chasing = true

      const creep = ctx.factory.creep({
        team: 1,
        lane,
        variant: 'melee',
        along: path.length - safeAlong - 120,
        strength: 1,
        damageBonus: 0,
        mega: false,
      })

      ctx.index.sync()
      expect(ctx.safety.isUnsafeFor(mage, mage.position)).toBe(false)
      expect(ctx.safety.isProtected(creep, mage.team)).toBe(true)
      expect(inReach(mage, creep)).toBe(true)

      const targeting = new TargetingSystem(ctx)
      targeting.update(0)
      expect(mage.targeting.target).toBe(creep)

      const before = { ...mage.position }
      new MovementSystem(ctx).update(0.1)
      expect(mage.position).toEqual(before)

      let attacked = false
      simulation.events.on('attacked', ({ attacker, target }) => {
        if (attacker === mage && target === creep) {
          attacked = true
        }
      })

      mage.attack.cooldown = 0
      new AttackSystem(ctx).update()
      expect(attacked).toBe(true)

      // A retained target is rejected once it moves beyond reach under the tower.
      Object.assign(creep.position, ctx.map.pointAt(path, safeAlong + mage.attack.range + 60))
      ctx.index.sync()
      targeting.update(0)
      expect(mage.targeting.target).toBeNull()

      // Acquiring that same target must not start a dive either.
      targeting.update(0)
      expect(mage.targeting.target).toBeNull()

      // A hero already exposed to tower fire still prioritizes backing off.
      Object.assign(mage.position, ctx.map.pointAt(path, safeAlong + 90))
      ctx.index.sync()
      targeting.update(0)
      expect(mage.targeting.target).toBeNull()
      simulation.dispose()
    },
  )
})
