import { describe, expect, it } from 'vitest'
import { ABILITY_PARAMS } from '@/content/abilities'
import { HERO_IDS, type HeroId, type ItemId, type LaneId } from '@/content/ids'
import { ITEMS } from '@/content/items'
import type { BattleSetup } from '@/domain/battle/contracts'
import { freshStructures } from '@/domain/match/structures'
import type { Lineup } from '@/domain/roster/Roster'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import type { DamageType } from '@/simulation/ecs/components'

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

const setup = (seed: string, ours: Lineup, theirs: Lineup, round = 3): BattleSetup => ({
  mode: 'threeLanes',
  round,
  seed,
  lineups: [ours, theirs],
  structures: [freshStructures(), freshStructures()],
})

describe('BattleSimulation', () => {
  it('is deterministic for the same seed', () => {
    const lanes = {
      top: ['giant'],
      mid: ['pyromancer'],
      bot: ['archer', 'acolyte'],
    } satisfies Partial<Record<LaneId, HeroId[]>>

    const run = () => new BattleSimulation(setup('same', lineup('a', lanes), lineup('b', lanes))).runToEnd()
    expect(run()).toEqual(run())
  })

  it('lets a stacked lane push the tower of an empty lane', () => {
    const outcome = new BattleSimulation(
      setup(
        'push',
        lineup('a', { bot: ['blademaster', 'acolyte', 'sapper'] }),
        lineup('b', { top: ['archer'] }),
      ),
    ).runToEnd()

    expect(outcome.stats[0].structureDamage.bot).toBeGreaterThan(0)
    expect(outcome.structures[1].bot).toBeLessThan(freshStructures().bot)
  })

  it('reports every hero that took part', () => {
    const outcome = new BattleSimulation(
      setup(
        'report',
        lineup('a', {
          mid: ['shade'],
          top: ['spearman'],
        }),
        lineup('b', { mid: ['frostWitch'] }),
      ),
    ).runToEnd()

    expect(outcome.heroes.map((h) => h.uid).sort()).toEqual(['a-mid-0', 'a-top-0', 'b-mid-0'])
  })

  it('runs every hero and ability without errors', () => {
    const all = [...HERO_IDS]

    const lanes = (offset: number) => ({
      top: all.slice(offset, offset + 3),
      mid: all.slice(offset + 3, offset + 6),
      bot: all.slice(offset + 6, offset + 9),
    })

    const sim = new BattleSimulation(setup('all', lineup('a', lanes(0)), lineup('b', lanes(9)), 8))
    const casts = new Set<string>()
    sim.events.on('abilityCast', ({ ability }) => casts.add(ability))
    const outcome = sim.runToEnd()
    expect(outcome.heroes).toHaveLength(18)
    expect(casts.size).toBeGreaterThan(12)
  })

  it('heals through lifesteal and survives one death with the aegis', () => {
    const base = lineup('a', { mid: ['blademaster'] })

    const armed: Lineup = {
      ...base,
      mid: base.mid.map((h) => ({
        ...h,
        items: ['vampireFang', 'aegis'],
      })),
    }

    const sim = new BattleSimulation(setup('items', armed, lineup('b', { mid: ['giant', 'frostWitch'] }), 6))
    let lifestolen = 0
    let revivals = 0
    sim.events.on('healed', ({ target, amount }) => {
      if (target.hero?.heroId === 'blademaster') {
        lifestolen += amount
      }
    })

    sim.events.on('revived', ({ byItem }) => {
      if (byItem) {
        revivals++
      }
    })

    sim.runToEnd()
    expect(lifestolen).toBeGreaterThan(0)
    expect(revivals).toBeLessThanOrEqual(1)
  })

  it('steals less life from abilities than from attacks', () => {
    const base = lineup('a', { mid: ['pyromancer'] })

    const armed: Lineup = {
      ...base,
      mid: base.mid.map((h) => ({
        ...h,
        items: ['vampireFang'],
      })),
    }

    const sim = new BattleSimulation(setup('fang', armed, lineup('b', { mid: ['giant', 'frostWitch'] }), 6))

    const shares: Record<DamageType, Set<number>> = {
      physical: new Set(),
      magical: new Set(),
    }

    /* Lifesteal heals right after the hit it comes from; a heal that tops the hero up is cut short. */
    let hit: { amount: number; type: DamageType } | null = null
    sim.events.on('damaged', ({ source, amount, type }) => {
      hit =
        source.team === 0 && source.hero
          ? {
              amount,
              type,
            }
          : null
    })

    sim.events.on('healed', ({ target, amount }) => {
      if (hit && target.team === 0 && target.health.current < target.health.max) {
        shares[hit.type].add(Math.round((amount / hit.amount) * 100))
      }

      hit = null
    })

    sim.runToEnd()
    expect([...shares.physical]).toEqual([20])
    expect([...shares.magical]).toEqual([10])
  })

  it('boosts healing with the chalice and not with the staff', () => {
    const acolyte = (items: ItemId[]) => {
      const base = lineup('a', { mid: ['acolyte'] })

      const ours: Lineup = {
        ...base,
        mid: base.mid.map((h) => ({
          ...h,
          items,
        })),
      }

      const sim = new BattleSimulation(setup('heal', ours, lineup('b', { mid: ['archer'] })))

      return sim.world.entities.find((e) => e.hero?.heroId === 'acolyte')!
    }

    const plain = acolyte([])
    const staff = acolyte(['staff'])
    const chalice = acolyte(['chalice'])

    expect(staff.caster!.power).toBeCloseTo(plain.caster!.power * 1.3)
    expect(staff.caster!.healPower).toBe(plain.caster!.healPower)
    expect(staff.healAura).toEqual(plain.healAura)

    const boost = ITEMS.chalice.modifiers.healPower!
    expect(chalice.caster!.power).toBe(plain.caster!.power)
    expect(chalice.caster!.healPower).toBeCloseTo(plain.caster!.healPower * boost)
    expect(chalice.healAura!.hpPercentPerSecond).toBeCloseTo(plain.healAura!.hpPercentPerSecond * boost)
  })

  it('rolls crits, bashes and evasion only where they belong', () => {
    const base = lineup('a', {
      mid: ['giant'],
      bot: ['archer'],
    })

    const armed: Lineup = {
      ...base,
      bot: base.bot.map((h) => ({
        ...h,
        items: ['broadsword'],
      })),
    }

    const sim = new BattleSimulation(
      setup(
        'procs',
        armed,
        lineup('b', {
          mid: ['rogue'],
          bot: ['shade'],
        }),
        5,
      ),
    )

    const crits = new Set<string>()
    const bashed: string[] = []
    const evaders = new Set<string>()
    sim.events.on('damaged', ({ source, crit }) => crit && crits.add(source.hero?.heroId ?? 'none'))
    sim.events.on('bashed', ({ source, target }) => bashed.push(`${source.hero?.heroId}>${target.kind}`))
    sim.events.on('evaded', ({ target }) => evaders.add(target.hero?.heroId ?? 'none'))
    sim.runToEnd()

    expect([...crits]).toEqual(['archer'])
    expect(bashed.length).toBeGreaterThan(0)
    expect(bashed.every((b) => b.startsWith('giant>') && b !== 'giant>structure')).toBe(true)
    expect([...evaders].sort()).toEqual(['rogue', 'shade'])
  })

  it('ends when a throne falls', () => {
    const structures = freshStructures()

    const weakened = {
      ...structures,
      bot: 0,
      throne: 50,
    }

    const sim = new BattleSimulation({
      mode: 'threeLanes',
      round: 10,
      seed: 'throne',
      lineups: [lineup('a', { bot: ['engineer', 'sapper', 'blademaster'] }), lineup('b', {})],
      structures: [freshStructures(), weakened],
    })

    const outcome = sim.runToEnd()
    expect(outcome.throneFell).toBe(1)
    expect(sim.elapsed).toBeLessThan(sim.duration)
  })

  it('heals heroes standing inside their own throne range', () => {
    const sim = new BattleSimulation(setup('fountain', lineup('a', { mid: ['giant'] }), lineup('b', {})))
    const hero = sim.queries.heroes.entities.find((h) => h.team === 0)!
    const throne = sim.queries.structures.entities.find((s) => s.team === 0 && s.structure.type === 'throne')!

    hero.position = { ...throne.position }
    hero.health.current = hero.health.max / 2
    sim.step()

    expect(hero.health.current).toBeGreaterThan(hero.health.max / 2)
  })

  it('calls heroes home when enemy heroes hit the throne', () => {
    const sim = new BattleSimulation(
      setup('defense', lineup('a', { top: ['giant'] }), lineup('b', { mid: ['sniper'] })),
    )

    const defender = sim.queries.heroes.entities.find((h) => h.team === 0)!
    const raider = sim.queries.heroes.entities.find((h) => h.team === 1)!
    const throne = sim.queries.structures.entities.find((s) => s.team === 0 && s.structure.type === 'throne')!

    sim.events.emit('damaged', {
      target: throne,
      source: raider,
      amount: 10,
      type: 'physical',
      crit: false,
    })

    sim.step()

    expect(defender.defend?.point).toEqual(throne.position)
  })

  it('never crits against buildings', () => {
    const base = lineup('a', { mid: ['sniper'] })

    const armed: Lineup = {
      ...base,
      mid: base.mid.map((hero) => ({
        ...hero,
        items: ['broadsword', 'broadsword'],
      })),
    }

    const sim = new BattleSimulation(setup('crits', armed, lineup('b', {})))

    const crits = {
      buildings: 0,
      units: 0,
    }

    sim.events.on('damaged', ({ target, crit }) => {
      if (crit) {
        crits[target.kind === 'structure' ? 'buildings' : 'units']++
      }
    })

    sim.runToEnd()

    expect(crits.units).toBeGreaterThan(0)
    expect(crits.buildings).toBe(0)
  })

  it('caps the skeletons a necromancer keeps alive however much mana it gets', () => {
    const sim = new BattleSimulation(
      setup('skeletons', lineup('a', { bot: ['necromancer'] }), lineup('b', {})),
    )

    const necromancer = sim.queries.heroes.entities.find((h) => h.team === 0)!
    const tower = sim.queries.structures.entities.find((s) => s.team === 1 && s.structure.lane === 'bot')!
    necromancer.position = {
      x: tower.position.x,
      y: tower.position.y + 200,
    }

    let peak = 0
    for (let i = 0; i < 60; i++) {
      necromancer.mana.current = necromancer.mana.max
      sim.step()

      peak = Math.max(
        peak,
        sim.queries.units.entities.filter((u) => u.owner === necromancer && u.creep?.summoned).length,
      )
    }

    expect(peak).toBe(ABILITY_PARAMS.raiseDead.maxAlive)
  })

  it('keeps gankers off buildings while they still farm creeps', () => {
    const outcome = new BattleSimulation(
      setup('gankers', lineup('a', { top: ['rogue', 'shade', 'butcher'] }), lineup('b', {})),
    ).runToEnd()

    const gankers = outcome.heroes.filter((h) => h.uid.startsWith('a-'))
    expect(gankers.every((h) => h.structureDamage === 0)).toBe(true)
    expect(gankers.reduce((sum, h) => sum + h.lastHits, 0)).toBeGreaterThan(0)
  })

  it('sends an idle ganker to enemy creeps on another lane', () => {
    const sim = new BattleSimulation(setup('farm', lineup('a', { top: ['rogue'] }), lineup('b', {})))
    const enemyCreeps = () => sim.queries.units.entities.filter((u) => u.kind === 'creep' && u.team === 1)
    while (!enemyCreeps().length) {
      sim.step()
    }

    const [creep, ...rest] = enemyCreeps()
    rest.forEach((c) => sim.world.remove(c))
    const bot = sim.map.path(1, 'bot')
    creep!.position = sim.map.pointAt(bot, bot.length / 2)
    creep!.speed = 0

    const ganker = sim.queries.heroes.entities.find((h) => h.team === 0)!
    ganker.roamer!.thinkTimer = 0
    ganker.targeting.target = null
    sim.step()

    expect(ganker.roamer?.farm).toBe(creep)

    const before = Math.hypot(ganker.position.x - creep!.position.x, ganker.position.y - creep!.position.y)
    for (let i = 0; i < 30; i++) {
      sim.step()
    }

    const after = Math.hypot(ganker.position.x - creep!.position.x, ganker.position.y - creep!.position.y)
    expect(after).toBeLessThan(before)
  })

  it('drops everything to finish a nearly dead throne, unless the hero is a ganker', () => {
    const targetOf = (heroId: HeroId) => {
      const sim = new BattleSimulation(
        setup(`finish-${heroId}`, lineup('a', { mid: [heroId] }), lineup('b', {})),
      )

      const hero = sim.queries.heroes.entities.find((h) => h.team === 0)!

      const throne = sim.queries.structures.entities.find(
        (s) => s.team === 1 && s.structure.type === 'throne',
      )!

      const creep = sim.queries.units.entities.find((u) => u.kind === 'creep' && u.team === 1)

      throne.health.current = throne.health.max * 0.05

      const laneTower = sim.queries.structures.entities.find(
        (s) => s.team === 1 && s.structure.slot === 'mid',
      )!

      laneTower.health.current = 0

      hero.position = {
        x: throne.position.x,
        y: throne.position.y + throne.radius + hero.targeting.aggroRange / 2,
      }

      hero.targeting.target = creep ?? null
      sim.step()

      return hero.targeting.target === throne
    }

    expect(targetOf('giant')).toBe(true)
    expect(targetOf('rogue')).toBe(false)
  })
})
