import { describe, expect, it } from 'vitest'
import { BATTLE } from '@/content/rules'
import { AttackSystem, attackSpot, inReach } from '@/simulation/systems/AttackSystem'
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

      // A target a little out of reach is still taken when the spot to shoot it from is out of tower fire.
      Object.assign(creep.position, ctx.map.pointAt(path, safeAlong + mage.attack.range + 40))
      ctx.index.sync()
      targeting.update(0)
      expect(mage.targeting.target).toBe(creep)

      const movement = new MovementSystem(ctx)
      for (let i = 0; i < 30 && !inReach(mage, creep); i++) {
        movement.update(BATTLE.step)
      }

      expect(inReach(mage, creep)).toBe(true)
      expect(ctx.safety.isUnsafeFor(mage, mage.position)).toBe(false)
      Object.assign(mage.position, ctx.map.pointAt(path, safeAlong))

      // A retained target is rejected once hitting it would take walking under the tower.
      Object.assign(creep.position, ctx.map.pointAt(path, safeAlong + mage.attack.range + 120))
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

describe('a wounded hero beside an enemy tower', () => {
  it('fights the creeps in reach instead of an attacker it cannot get to', () => {
    const { simulation, ctx, hero, structure } = arena({
      ours: {
        mid: [
          {
            uid: 'mine',
            heroId: 'spearman',
          },
        ],
      },
      theirs: {
        mid: [
          {
            uid: 'theirs',
            heroId: 'pyromancer',
          },
        ],
      },
    })

    const mine = hero('mine')
    const theirs = hero('theirs')
    const tower = structure(1, 'mid')
    const path = ctx.map.path(0, 'mid')
    const towerAlong = ctx.map.project(path, tower.position).along

    const edgeAlong =
      towerAlong - tower.attack!.range - tower.radius - mine.radius - BATTLE.towerSafetyMargin - 10

    Object.assign(mine.position, ctx.map.pointAt(path, edgeAlong))
    mine.health.current = mine.health.max * 0.2
    Object.assign(theirs.position, ctx.map.pointAt(path, towerAlong - 40))

    const creep = ctx.factory.creep({
      team: 1,
      lane: 'mid',
      variant: 'melee',
      along: path.length - edgeAlong,
      strength: 1,
      damageBonus: 0,
      mega: false,
    })

    Object.assign(creep.position, ctx.map.pointAt(path, edgeAlong + mine.radius + creep.radius))

    // Our creeps tank the tower, so only the wounded hero itself still fears it.
    ctx.factory.creep({
      team: 0,
      lane: 'mid',
      variant: 'melee',
      along: towerAlong - tower.attack!.range / 2,
      strength: 1,
      damageBonus: 0,
      mega: false,
    })

    ctx.index.sync()
    expect(inReach(mine, creep)).toBe(true)
    expect(ctx.safety.isProtected(theirs, mine.team)).toBe(false)
    expect(ctx.safety.isUnsafeFor(mine, attackSpot(mine, theirs))).toBe(true)

    simulation.events.emit('damaged', {
      target: mine,
      source: theirs,
      amount: 10,
      type: 'magical',
      crit: false,
    })

    new TargetingSystem(ctx).update(0)
    expect(mine.targeting.target).toBe(creep)

    new MovementSystem(ctx).update(BATTLE.step)
    expect(mine.targeting.target).toBe(creep)
    simulation.dispose()
  })
})
