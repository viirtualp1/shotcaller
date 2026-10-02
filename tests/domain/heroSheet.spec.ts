import { describe, expect, it } from 'vitest'
import type { HeroId, ItemId, StarLevel } from '@/content/ids'
import { freshStructures } from '@/domain/match/structures'
import { heroSheet } from '@/domain/roster/heroSheet'
import { resolveLane } from '@/domain/synergy/resolveLane'
import { BattleSimulation } from '@/simulation/BattleSimulation'

const hero = (uid: string, heroId: HeroId, stars: StarLevel, items: ItemId[]) => ({
  uid,
  heroId,
  stars,
  items,
})

describe('hero sheet', () => {
  it('matches the hero the battle builds, with stars, items and lane synergies', () => {
    const lane = [
      hero('archer', 'archer', 2, ['gloves', 'staff']),
      hero('acolyte', 'acolyte', 1, ['chalice']),
    ]

    const simulation = new BattleSimulation({
      mode: 'threeLanes',
      round: 1,
      seed: 'sheet',
      lineups: [
        {
          top: [],
          mid: [],
          bot: lane,
        },
        {
          top: [],
          mid: [],
          bot: [],
        },
      ],
      structures: [freshStructures(), freshStructures()],
    })

    const synergies = resolveLane('bot', ['archer', 'acolyte'], 'threeLanes').synergies
    expect(synergies.length).toBeGreaterThan(0)

    for (const owned of lane) {
      const entity = simulation.world.entities.find((e) => e.hero?.uid === owned.uid)!

      const { total } = heroSheet({
        ...owned,
        synergies,
      })

      expect(total.hp).toBeCloseTo(entity.health!.max)
      expect(total.damage).toBeCloseTo(entity.attack!.damage)
      expect(total.attackInterval).toBeCloseTo(entity.attack!.interval)
      expect(total.speed).toBeCloseTo(entity.speed!)
      expect(total.protection).toBeCloseTo(1 - (1 - entity.armor!) * entity.damageTaken!)
      expect(total.spellPower).toBeCloseTo(entity.caster!.power)
      expect(total.healPower).toBeCloseTo(entity.caster!.healPower)
      expect(total.manaGain).toBeCloseTo(entity.mana!.gain)
      expect(total.structureDamage).toBeCloseTo(entity.structureDamage!)
    }
  })

  it('keeps items and synergies out of the base numbers', () => {
    const plain = heroSheet({
      heroId: 'archer',
      stars: 1,
    })

    const geared = heroSheet({
      heroId: 'archer',
      stars: 1,
      items: ['gloves'],
    })

    expect(geared.base).toEqual(plain.base)
    expect(geared.total.attackInterval).toBeCloseTo(plain.base.attackInterval / 1.2)
  })

  it('counts the attacks a full mana bar takes, and the head start of initiators', () => {
    // Spearman: 80 mana at 10 a hit, and initiators start a fight with half of it.
    expect(
      heroSheet({
        heroId: 'spearman',
        stars: 1,
      }).mana,
    ).toEqual({
      cost: 80,
      perAttack: 10,
      perTenthOfHealthLost: 4,
      attacksToCast: 8,
      attacksToFirstCast: 4,
    })

    // Storm Shaman is a mage, who gains mana half as fast again; a Mana Stone adds 50% on top.
    const shaman = heroSheet({
      heroId: 'shaman',
      stars: 1,
      items: ['manaStone'],
    }).mana

    expect(shaman.perAttack).toBeCloseTo(22.5)
    expect(shaman.attacksToCast).toBe(4)
  })
})
