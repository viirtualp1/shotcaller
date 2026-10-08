import { describe, expect, it } from 'vitest'
import { FACTIONS } from '@/content/factions'
import { HEROES } from '@/content/heroes'
import { FACTION_IDS, HERO_IDS } from '@/content/ids'
import { heroSheet } from '@/domain/roster/heroSheet'
import { laneFactions } from '@/domain/synergy/laneFactions'
import { resolveLane } from '@/domain/synergy/resolveLane'
import { EntityFactory } from '@/simulation/services/EntityFactory'
import { World } from 'miniplex'
import type { Entity } from '@/simulation/ecs/components'
import { laneMapFor } from '@/simulation/map/LaneMap'
import { createRng } from '@/core/random/rng'

describe('factions', () => {
  it('gives every hero but the Changeling a faction, including the three tier-four additions', () => {
    for (const faction of FACTION_IDS) {
      const members = HERO_IDS.filter((id) => HEROES[id].faction === faction)

      expect(members).toHaveLength(['wildkin', 'arcanum', 'grave'].includes(faction) ? 5 : 4)
      expect(new Set(members.map((id) => HEROES[id].tier)).size).toBeGreaterThan(1)
    }

    expect(HERO_IDS.filter((id) => HEROES[id].faction === null)).toEqual(['changeling'])
  })

  it('reaches a step with two heroes of a faction on the lane and the next with three', () => {
    expect(laneFactions(['spearman', 'archer']).bonusFor(0)).toBeNull()

    const pair = laneFactions(['spearman', 'herald', 'archer'])
    expect(pair.bonusFor(0)).toEqual({
      faction: 'legion',
      tier: 2,
      bonus: FACTIONS.legion.tiers[2],
    })

    expect(pair.bonusFor(2)).toBeNull()

    expect(pair.standings).toEqual([
      {
        faction: 'legion',
        count: 2,
        tier: 2,
      },
      {
        faction: 'wildkin',
        count: 1,
        tier: null,
      },
    ])

    expect(laneFactions(['spearman', 'herald', 'sniper']).bonusFor(2)?.tier).toBe(3)
  })

  it('lets the Changeling join the strongest faction of its lane, and none on a lane of its own', () => {
    const lane = laneFactions(['archer', 'shaman', 'pyromancer', 'changeling'])

    expect(lane.heroFactions).toEqual(['wildkin', 'arcanum', 'arcanum', 'arcanum'])
    expect(lane.bonusFor(3)?.tier).toBe(3)

    /* A tie goes to the first faction in the usual order. */
    expect(laneFactions(['archer', 'spearman', 'changeling']).heroFactions[2]).toBe('legion')

    expect(laneFactions(['changeling']).heroFactions).toEqual([null])
  })

  it('puts the bonus on the hero sheet and on the hero the battle builds', () => {
    const plain = heroSheet({
      heroId: 'spearman',
      stars: 1,
    })

    const held = heroSheet({
      heroId: 'spearman',
      stars: 1,
      faction: {
        faction: 'legion',
        tier: 2,
      },
    })

    expect(held.total.protection).toBeGreaterThan(plain.total.protection)

    const factory = new EntityFactory(new World<Entity>(), laneMapFor('twoLanes'), createRng('factions'))

    const report = resolveLane('top', ['rogue', 'shade'], 'twoLanes')

    const hero = factory.hero(
      {
        uid: 'r',
        heroId: 'rogue',
        stars: 1,
        items: [],
      },
      0,
      'top',
      report,
      0,
    )

    expect(hero.crit?.prd.chance).toBeCloseTo(FACTIONS.grave.tiers[2].effects.critChance!)
    expect(hero.crit?.multiplier).toBe(FACTIONS.grave.tiers[2].effects.critMultiplier)
  })

  it('keeps role synergies on faction members and on recruits from another faction', () => {
    const pair = resolveLane('top', ['spearman', 'herald', 'acolyte'], 'twoLanes')
    expect(pair.synergies).toContain('bulwark')

    const base = heroSheet({
      heroId: 'spearman',
      stars: 1,
    }).total

    const together = heroSheet({
      heroId: 'spearman',
      stars: 1,
      synergies: pair.synergies,
      faction: {
        faction: 'legion',
        tier: 2,
      },
    }).total

    expect(together.hp / base.hp).toBeCloseTo(1.4375)
    expect((1 - together.protection) / (1 - base.protection)).toBeCloseTo(0.792)

    const mixed = resolveLane('top', ['spearman', 'herald', 'pyromancer'], 'twoLanes')
    expect(mixed.factions.bonusFor(2)).toBeNull()
    expect(mixed.synergies).toContain('setup')
    expect(mixed.synergyModifiersFor('mage').spellPower).toBeCloseTo(1.4)

    const trio = resolveLane('top', ['spearman', 'herald', 'sniper'], 'twoLanes')
    expect(trio.synergies).toEqual(['trilane'])
    expect(trio.synergyModifiersFor('carry').attackSpeed).toBe(1)
    expect(trio.synergyModifiersFor('carry').maxHp).toBeCloseTo(1.25)

    const wild = resolveLane('top', ['archer', 'warden'], 'twoLanes')
    expect(wild.factions.bonusFor(0)?.tier).toBe(2)
    expect(wild.synergyModifiersFor('carry').attackSpeed).toBeCloseTo(1.35)
  })
})
