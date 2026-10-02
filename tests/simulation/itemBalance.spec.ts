import { describe, expect, it } from 'vitest'
import { ABILITY_PARAMS } from '@/content/abilities'
import type { HeroId, ItemId } from '@/content/ids'
import { BATTLE } from '@/content/rules'
import { freshStructures } from '@/domain/match/structures'
import { heroSheet } from '@/domain/roster/heroSheet'
import { BattleSimulation } from '@/simulation/BattleSimulation'

function practice(heroId: HeroId, items: ItemId[]) {
  const simulation = new BattleSimulation({
    mode: 'oneLane',
    round: 1,
    seed: 'item-comparison',
    lineups: [
      {
        top: [],
        mid: [
          {
            uid: 'test',
            heroId,
            stars: 1,
            items,
          },
        ],
        bot: [],
      },
      {
        top: [],
        mid: [],
        bot: [],
      },
    ],
    structures: [freshStructures(), freshStructures()],
    sandbox: {
      dummies: 1,
      creeps: false,
      endless: true,
    },
  })

  const hero = simulation.queries.heroes.entities[0]!
  const dummy = simulation.queries.units.entities.find((unit) => unit.dummy)!
  Object.assign(hero.position, {
    x: dummy.position.x - 45,
    y: dummy.position.y,
  })

  return {
    simulation,
    hero,
  }
}

function damage(heroId: HeroId, items: ItemId[]) {
  const { simulation, hero } = practice(heroId, items)
  for (let i = 0; i < 60 / BATTLE.step; i++) {
    simulation.step()
  }

  const result = hero.hero.damageDealt
  simulation.dispose()

  return result
}

describe('role-aware item balance', () => {
  it.each(['pyromancer', 'shaman', 'frostWitch'] as const)(
    '%s gets more practice damage from caster gear than two haste items',
    { timeout: 15000 },
    (heroId) => {
      expect(damage(heroId, ['staff', 'manaStone'])).toBeGreaterThan(
        damage(heroId, ['gloves', 'gloves']) * 1.05,
      )
    },
  )

  it.each(['acolyte', 'spearman', 'shaman'] as const)('%s keeps a modest haste bonus', (heroId) => {
    const sheet = heroSheet({
      heroId,
      stars: 1,
      items: ['gloves', 'gloves'],
    })

    expect(sheet.base.attackInterval / sheet.total.attackInterval).toBeCloseTo(1.16)
  })

  it('adds offensive item bonuses before applying role and synergy multipliers', () => {
    const sheet = heroSheet({
      heroId: 'shaman',
      stars: 1,
      items: ['manaStone', 'manaStone'],
    })

    expect(sheet.total.manaGain).toBeCloseTo(sheet.base.manaGain * 2)

    const carry = heroSheet({
      heroId: 'archer',
      stars: 1,
      items: ['gloves', 'gloves'],
    })

    expect(carry.base.attackInterval / carry.total.attackInterval).toBeCloseTo(1.4)
  })

  it('amplifies support shields with healing gear and matches the tooltip stat', () => {
    const { simulation, hero } = practice('oracle', ['chalice'])
    hero.health.current = hero.health.max / 2
    hero.mana.current = hero.mana.max
    simulation.step()

    const sheet = heroSheet({
      heroId: 'oracle',
      stars: 1,
      items: ['chalice'],
    })

    expect(hero.shield?.amount).toBeCloseTo(ABILITY_PARAMS.shield.absorb * sheet.total.healPower)
    simulation.dispose()
  })
})
