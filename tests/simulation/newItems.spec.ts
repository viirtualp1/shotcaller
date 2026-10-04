import { describe, expect, it } from 'vitest'
import { ABILITY_PARAMS } from '@/content/abilities'
import { ITEMS } from '@/content/items'
import { soulPower } from '@/domain/roster/heroSheet'
import { ABILITIES } from '@/simulation/abilities/registry'
import { PortalSystem } from '@/simulation/systems/PortalSystem'
import { AbilitySystem } from '@/simulation/systems/AbilitySystem'
import { arena } from '../helpers/battle'

const STEP = 1 / 30
const jar = ITEMS.soulJar.effects
const bond = ITEMS.soulbond.effects
const echo = ITEMS.echoShard.effects
const curse = ITEMS.cursedBlade.effects.curse!

/** Two heroes facing each other in the middle of the mid lane. */
function duel(
  oursItems: Parameters<typeof arena>[0]['ours'],
  theirsItems: Parameters<typeof arena>[0]['theirs'],
) {
  const battle = arena({
    ours: oursItems,
    theirs: theirsItems,
  })

  battle.ctx.index.sync()

  return battle
}

describe('Soul Jar', () => {
  it('collects a soul for every hero kill, up to its limit', () => {
    const { ctx, hero } = duel(
      {
        mid: [
          {
            uid: 'reaper',
            heroId: 'blademaster',
            items: ['soulJar'],
            souls: jar.soulMax! - 1,
          },
        ],
      },
      {
        mid: [
          {
            uid: 'a',
            heroId: 'archer',
          },
          {
            uid: 'b',
            heroId: 'archer',
          },
        ],
      },
    )

    const reaper = hero('reaper')
    ctx.combat.dealDamage(reaper, hero('a'), 1e6, 'magical')
    expect(reaper.hero.souls).toBe(jar.soulMax)

    ctx.combat.dealDamage(reaper, hero('b'), 1e6, 'magical')
    expect(reaper.hero.souls).toBe(jar.soulMax)
  })

  it('gathers nothing without a jar', () => {
    const { ctx, hero } = duel(
      {
        mid: [
          {
            uid: 'reaper',
            heroId: 'blademaster',
          },
        ],
      },
      {
        mid: [
          {
            uid: 'a',
            heroId: 'archer',
          },
        ],
      },
    )

    ctx.combat.dealDamage(hero('reaper'), hero('a'), 1e6, 'magical')
    expect(hero('reaper').hero.souls).toBe(0)
  })

  it('turns souls into attack damage only while the hero holds the jar', () => {
    expect(soulPower(['soulJar'], 5)).toBeCloseTo(1 + 5 * jar.soulDamage!)
    expect(soulPower(['soulJar'], 99)).toBeCloseTo(1 + jar.soulMax! * jar.soulDamage!)
    expect(soulPower(['broadsword'], 5)).toBe(1)
  })

  it('reports the souls a hero ends the round with', () => {
    const { ctx, hero, simulation } = duel(
      {
        mid: [
          {
            uid: 'reaper',
            heroId: 'blademaster',
            items: ['soulJar'],
            souls: 3,
          },
        ],
      },
      {
        mid: [
          {
            uid: 'a',
            heroId: 'archer',
          },
        ],
      },
    )

    ctx.combat.dealDamage(hero('reaper'), hero('a'), 1e6, 'magical')
    const report = simulation.outcome().heroes.find((h) => h.uid === 'reaper')!

    expect(report.souls).toBe(4)
    expect(simulation.outcome().heroes.find((h) => h.uid === 'a')!.souls).toBeUndefined()
  })
})

describe('Soulbond', () => {
  const bonded = (items: readonly ('soulbond' | 'chainmail')[]) =>
    duel(
      {
        mid: [
          {
            uid: 'tank',
            heroId: 'giant',
            items: ['soulbond', ...items],
          },
          {
            uid: 'carry',
            heroId: 'archer',
            items: ['soulbond'],
          },
        ],
      },
      {
        mid: [
          {
            uid: 'enemy',
            heroId: 'blademaster',
          },
        ],
      },
    )

  it('passes part of the damage to the bonded lane-mate', () => {
    const { ctx, hero } = bonded([])
    const carry = hero('carry')
    const tank = hero('tank')
    const carryBefore = carry.health.current
    const tankBefore = tank.health.current

    ctx.combat.dealDamage(hero('enemy'), carry, 100, 'magical')

    expect(carryBefore - carry.health.current).toBeCloseTo(100 * (1 - bond.bond!))
    expect(tankBefore - tank.health.current).toBeCloseTo(100 * bond.bond!)
  })

  it('lets the partner soften its share with its own protection', () => {
    const { ctx, hero } = bonded(['chainmail'])
    const tank = hero('tank')
    const before = tank.health.current
    ctx.combat.dealDamage(hero('enemy'), hero('carry'), 100, 'magical')

    expect(before - tank.health.current).toBeCloseTo(
      100 * bond.bond! * ITEMS.chainmail.modifiers.damageTaken!,
    )
  })

  it('needs a partner on the same lane', () => {
    const { ctx, hero } = duel(
      {
        top: [
          {
            uid: 'tank',
            heroId: 'giant',
            items: ['soulbond'],
          },
        ],
        mid: [
          {
            uid: 'carry',
            heroId: 'archer',
            items: ['soulbond'],
          },
        ],
      },
      {
        mid: [
          {
            uid: 'enemy',
            heroId: 'blademaster',
          },
        ],
      },
    )

    const carry = hero('carry')
    const before = carry.health.current
    ctx.combat.dealDamage(hero('enemy'), carry, 100, 'magical')

    expect(carry.bond).toBeUndefined()
    expect(before - carry.health.current).toBeCloseTo(100)
  })

  it('breaks while the pair stands far apart', () => {
    const { ctx, hero } = bonded([])
    const carry = hero('carry')
    Object.assign(hero('tank').position, {
      x: carry.position.x + bond.bondRange! + 50,
      y: carry.position.y,
    })

    const before = carry.health.current
    ctx.combat.dealDamage(hero('enemy'), carry, 100, 'magical')

    expect(before - carry.health.current).toBeCloseTo(100)
  })
})

describe('Echo Shard', () => {
  it('casts the ability again, weaker and with a shorter stun', () => {
    const { ctx, hero } = duel(
      {
        mid: [
          {
            uid: 'lancer',
            heroId: 'spearman',
            items: ['echoShard'],
          },
        ],
      },
      {
        mid: [
          {
            uid: 'enemy',
            heroId: 'giant',
          },
        ],
      },
    )

    const lancer = hero('lancer')
    const enemy = hero('enemy')
    Object.assign(enemy.position, {
      x: lancer.position.x + 120,
      y: lancer.position.y,
    })

    lancer.mana.current = lancer.mana.max
    ctx.index.sync()

    const hits: number[] = []
    const casts: boolean[] = []
    ctx.events.on('damaged', ({ source, amount }) => source === lancer && hits.push(amount))
    ctx.events.on('abilityCast', ({ echo: repeat }) => casts.push(Boolean(repeat)))

    const abilities = new AbilitySystem(ctx, ABILITIES)
    abilities.update(STEP)
    expect(enemy.status.stun).toBeCloseTo(ABILITY_PARAMS.charge.stun)

    enemy.status.stun = 0

    for (let time = 0; time <= echo.echoDelay!; time += STEP) {
      abilities.update(STEP)
    }

    expect(casts).toEqual([false, true])
    expect(enemy.status.stun).toBeCloseTo(ABILITY_PARAMS.charge.stun * echo.echo!)
    expect(hits[1]).toBeCloseTo(hits[0]! * echo.echo!)
    expect(lancer.caster.power).toBe(1)
    expect(lancer.caster.stunScale).toBe(1)
  })

  it('fizzles when the caster is stunned as it comes due', () => {
    const { ctx, hero } = duel(
      {
        mid: [
          {
            uid: 'lancer',
            heroId: 'spearman',
            items: ['echoShard'],
          },
        ],
      },
      {
        mid: [
          {
            uid: 'enemy',
            heroId: 'giant',
          },
        ],
      },
    )

    const lancer = hero('lancer')
    Object.assign(hero('enemy').position, {
      x: lancer.position.x + 120,
      y: lancer.position.y,
    })

    lancer.mana.current = lancer.mana.max
    ctx.index.sync()

    let casts = 0
    ctx.events.on('abilityCast', () => casts++)
    const abilities = new AbilitySystem(ctx, ABILITIES)
    abilities.update(STEP)
    lancer.status.stun = echo.echoDelay! * 2

    for (let time = 0; time <= echo.echoDelay!; time += STEP) {
      abilities.update(STEP)
    }

    expect(casts).toBe(1)
    expect(lancer.echo).toBeUndefined()
  })
})

describe('Town Portal', () => {
  function portal() {
    const battle = arena({
      ours: {
        top: [
          {
            uid: 'runner',
            heroId: 'blademaster',
            items: ['townPortal'],
          },
        ],
      },
    })

    const tower = battle.structure(0, 'mid')

    const enemy = battle.ctx.factory.creep({
      team: 1,
      lane: 'mid',
      variant: 'siege',
      along: 0,
      strength: 1,
      damageBonus: 0,
      mega: false,
    })

    /* Out on its own lane, by the top tower: well beyond the portal's minimum distance from mid. */
    const runner = battle.hero('runner')
    Object.assign(runner.position, battle.structure(0, 'top').position)

    return {
      ...battle,
      tower,
      enemy,
      runner,
      portals: new PortalSystem(battle.ctx),
    }
  }

  it('sends the wearer once a round to a falling tower on another lane', () => {
    const { ctx, enemy, portals, runner, structure, tower } = portal()
    tower.health.current = tower.health.max * 0.3
    ctx.combat.dealDamage(enemy, tower, 10, 'physical')
    portals.update()

    expect(
      Math.hypot(runner.position.x - tower.position.x, runner.position.y - tower.position.y),
    ).toBeLessThan(60)

    expect(runner.hero.lane).toBe('mid')
    expect(runner.hero.startLane).toBe('top')
    expect(runner.itemEffects?.portal).toBe(0)

    const away = { ...structure(0, 'top').position }
    Object.assign(runner.position, away)
    ctx.combat.dealDamage(enemy, tower, 10, 'physical')
    portals.update()
    expect(runner.position).toEqual(away)
  })

  it('stays put while the tower is still healthy', () => {
    const { ctx, enemy, portals, runner, tower } = portal()
    const start = { ...runner.position }
    ctx.combat.dealDamage(enemy, tower, 10, 'physical')
    portals.update()

    expect(runner.position).toEqual(start)
    expect(runner.itemEffects?.portal).toBe(ITEMS.townPortal.effects.portal)
  })
})

describe('Cursed Blade', () => {
  it('costs its own throne health on every death, counted for the enemy', () => {
    const { ctx, hero, simulation, structure } = duel(
      {
        mid: [
          {
            uid: 'cursed',
            heroId: 'blademaster',
            items: ['cursedBlade'],
          },
        ],
      },
      {
        mid: [
          {
            uid: 'enemy',
            heroId: 'archer',
          },
        ],
      },
    )

    const throne = structure(0, 'throne')
    const before = throne.health.current
    ctx.combat.dealDamage(hero('enemy'), hero('cursed'), 1e6, 'magical')

    expect(before - throne.health.current).toBeCloseTo(curse)
    expect(simulation.outcome().stats[1].structureDamage.throne).toBeCloseTo(curse)
  })

  it('never brings the throne down by itself', () => {
    const { ctx, hero, structure } = duel(
      {
        mid: [
          {
            uid: 'cursed',
            heroId: 'blademaster',
            items: ['cursedBlade'],
          },
        ],
      },
      {
        mid: [
          {
            uid: 'enemy',
            heroId: 'archer',
          },
        ],
      },
    )

    const throne = structure(0, 'throne')
    throne.health.current = 10
    ctx.combat.dealDamage(hero('enemy'), hero('cursed'), 1e6, 'magical')

    expect(throne.health.current).toBe(1)
  })

  it('spares the throne when Aegis saves the wearer', () => {
    const { ctx, hero, structure } = duel(
      {
        mid: [
          {
            uid: 'cursed',
            heroId: 'blademaster',
            items: ['cursedBlade', 'aegis'],
          },
        ],
      },
      {
        mid: [
          {
            uid: 'enemy',
            heroId: 'archer',
          },
        ],
      },
    )

    const throne = structure(0, 'throne')
    const before = throne.health.current
    ctx.combat.dealDamage(hero('enemy'), hero('cursed'), 1e6, 'magical')

    expect(throne.health.current).toBe(before)
  })

  it('makes two blades add up rather than compound', () => {
    const { hero } = duel(
      {
        mid: [
          {
            uid: 'one',
            heroId: 'blademaster',
            items: ['cursedBlade'],
          },
          {
            uid: 'two',
            heroId: 'blademaster',
            items: ['cursedBlade', 'cursedBlade'],
          },
        ],
      },
      {},
    )

    const bonus = ITEMS.cursedBlade.modifiers.damage! - 1
    expect(hero('two').attack.damage / hero('one').attack.damage).toBeCloseTo((1 + 2 * bonus) / (1 + bonus))
  })
})
