import { describe, expect, it } from 'vitest'
import { HERO_IDS, type HeroId, type LaneId } from '@/content/ids'
import type { BattleSetup } from '@/domain/battle/contracts'
import { freshStructures } from '@/domain/match/structures'
import type { Lineup } from '@/domain/roster/Roster'
import { BattleSimulation } from '@/simulation/BattleSimulation'

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
})
