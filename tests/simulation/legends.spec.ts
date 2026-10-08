import { describe, expect, it } from 'vitest'
import { HEROES } from '@/content/heroes'
import { HERO_IDS, MODE_IDS } from '@/content/ids'
import { MODES } from '@/content/modes'
import { createRng } from '@/core/random/rng'
import { HeroPool } from '@/domain/economy/HeroPool'
import { Shop } from '@/domain/economy/Shop'
import { ABILITIES } from '@/simulation/abilities/registry'
import { isAlive } from '@/simulation/ecs/components'
import { AbilitySystem } from '@/simulation/systems/AbilitySystem'
import { arena } from '../helpers/battle'

describe('tier IV', () => {
  it.each(MODE_IDS)('only opens at the last two levels in %s', (mode) => {
    const levels = MODES[mode].levels
    expect(levels.slice(0, -2).every((level) => level.odds[3] === 0)).toBe(true)
    expect(levels.at(-2)!.odds[3]).toBe(0.08)
    expect(levels.at(-1)!.odds[3]).toBe(0.2)

    for (const level of levels) {
      expect(level.odds.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1)
    }
  })

  it('does not bypass the level gate when all cheaper heroes are sold out', () => {
    const pool = new HeroPool()
    pool.restore(Object.fromEntries(HERO_IDS.map((id) => [id, HEROES[id].tier === 4 ? 4 : 0])))
    const shop = new Shop(pool, createRng('legend-shop'))
    shop.restock([1, 0, 0, 0])
    expect(shop.slots.every((id) => id === null)).toBe(true)
    shop.restock([0, 0, 0, 1])
    expect(shop.slots.every((id) => id && HEROES[id].tier === 4)).toBe(true)
  })

  it('keeps all three legends in rotation with four shared copies each', () => {
    const pool = new HeroPool()
    const rotation = pool.rotate(createRng('legend-rotation'), 5)
    for (const hero of ['alpha', 'archon', 'reaper'] as const) {
      expect(rotation).toContain(hero)
      expect(pool.available(hero)).toBe(4)
    }
  })
})

describe('legend abilities', () => {
  it('caps the pack, attributes summons to Alpha and applies the chosen talent', () => {
    const battle = arena({
      ours: {
        mid: [
          {
            uid: 'alpha',
            heroId: 'alpha',
            stars: 2,
            talent: 0,
          },
        ],
      },
      theirs: {
        mid: [
          {
            uid: 'enemy',
            heroId: 'giant',
          },
        ],
      },
    })

    const alpha = battle.hero('alpha')
    Object.assign(battle.hero('enemy').position, alpha.position)
    battle.ctx.index.sync()
    expect(ABILITIES.packCall.cast(alpha, battle.ctx)).toBe(true)
    expect(ABILITIES.packCall.cast(alpha, battle.ctx)).toBe(true)
    expect(ABILITIES.packCall.cast(alpha, battle.ctx)).toBe(false)
    const wolves = battle.ctx.queries.expiring.entities.filter((unit) => unit.owner === alpha)
    expect(wolves).toHaveLength(8)
    expect(wolves.every((unit) => unit.speed === 125 && unit.lifetime === 10)).toBe(true)
  })

  it('strikes the busiest lane across the map and ignores dead heroes', () => {
    const battle = arena({
      ours: {
        top: [
          {
            uid: 'mage',
            heroId: 'archon',
          },
        ],
      },
      theirs: {
        mid: [
          {
            uid: 'a',
            heroId: 'giant',
          },
          {
            uid: 'b',
            heroId: 'rogue',
          },
        ],
        bot: [
          {
            uid: 'c',
            heroId: 'archer',
          },
        ],
      },
    })

    const a = battle.hero('a')
    const c = battle.hero('c')
    const before = [a.health.current, c.health.current]
    expect(ABILITIES.starfall.cast(battle.hero('mage'), battle.ctx)).toBe(true)
    expect(a.health.current).toBeLessThan(before[0]!)
    expect(a.status.stun).toBe(0.6)
    expect(c.health.current).toBe(before[1])
    a.health.current = 0
    battle.hero('b').health.current = 0
    ABILITIES.starfall.cast(battle.hero('mage'), battle.ctx)
    expect(c.health.current).toBeLessThan(before[1]!)
  })

  it.each([false, true])('executes through shields; revival=%s controls the mana refund', (revive) => {
    const battle = arena({
      ours: {
        mid: [
          {
            uid: 'killer',
            heroId: 'reaper',
          },
        ],
      },
      theirs: {
        mid: [
          {
            uid: 'victim',
            heroId: 'giant',
            items: revive ? ['aegis'] : [],
          },
        ],
      },
    })

    const killer = battle.hero('killer')
    const victim = battle.hero('victim')
    Object.assign(victim.position, killer.position)
    victim.health.current = victim.health.max * 0.1
    victim.damageTaken = 0.1

    victim.shield = {
      amount: 5000,
      remaining: 10,
    }

    killer.mana.current = killer.mana.max
    battle.ctx.index.sync()
    new AbilitySystem(battle.ctx, ABILITIES).update(1 / 30)
    expect(isAlive(victim)).toBe(revive)
    expect(killer.mana.current).toBe(revive ? 0 : killer.mana.max)
    expect(victim.shield.amount).toBe(5000)
  })
})
