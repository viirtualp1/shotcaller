import { describe, expect, it } from 'vitest'
import { heroVitals, previewHeroVitals } from '@/application/heroVitals'
import { freshStructures } from '@/domain/match/structures'
import { BattleSimulation } from '@/simulation/BattleSimulation'

function arena() {
  return new BattleSimulation({
    mode: 'oneLane',
    round: 1,
    seed: 'vitals',
    lineups: [
      {
        top: [],
        mid: [
          {
            uid: 'carry',
            heroId: 'archer',
            stars: 1,
            items: ['manaStone'],
          },
          {
            uid: 'support',
            heroId: 'acolyte',
            stars: 2,
            items: ['chalice'],
          },
        ],
        bot: [],
      },
      {
        top: [],
        mid: [
          {
            uid: 'enemy',
            heroId: 'acolyte',
            stars: 1,
            items: [],
          },
        ],
        bot: [],
      },
    ],
    structures: [freshStructures('oneLane'), freshStructures('oneLane')],
  })
}

describe('hero resources', () => {
  it('previews the same health, mana and own regeneration that a battle creates', () => {
    const simulation = arena()
    const support = simulation.queries.heroes.entities.find((hero) => hero.hero.uid === 'support')!

    const preview = previewHeroVitals({
      heroId: 'acolyte',
      stars: 2,
      items: ['chalice'],
    })

    const actual = heroVitals(support, [support])

    expect(preview.maxHealth).toBe(actual.maxHealth)
    expect(preview.mana).toBe(actual.mana)
    expect(preview.manaPerAttack).toBe(actual.manaPerAttack)
    expect(preview.healthRegen).toBeCloseTo(actual.healthRegen)
    simulation.dispose()
  })

  it('reads current resources and farm damage, counting only nearby living allied auras', () => {
    const simulation = arena()

    const [carry, support, enemy] = ['carry', 'support', 'enemy'].map((uid) =>
      simulation.queries.heroes.entities.find((hero) => hero.hero.uid === uid)!,
    )

    Object.assign(carry!.position, {
      x: 500,
      y: 500,
    })

    Object.assign(support!.position, {
      x: 510,
      y: 500,
    })

    Object.assign(enemy!.position, {
      x: 510,
      y: 500,
    })

    carry!.health.current = 123.5
    carry!.mana.current = 42.5
    carry!.hero.farmStacks = 10

    const values = heroVitals(carry!, simulation.queries.auras.entities)
    expect(values.health).toBe(123.5)
    expect(values.mana).toBe(42.5)
    expect(values.manaPerAttack).toBeGreaterThan(10)
    expect(values.damage).toBeCloseTo(carry!.attack.damage * 1.3)
    expect(values.healthRegen).toBeCloseTo(carry!.health.max * support!.healAura!.hpPercentPerSecond)

    support!.position.x = 900
    expect(heroVitals(carry!, simulation.queries.auras.entities).healthRegen).toBe(0)

    support!.position.x = 510
    simulation.world.addComponent(support!, 'dead', true)
    expect(heroVitals(carry!, [support!, enemy!]).healthRegen).toBe(0)

    simulation.world.addComponent(carry!, 'dead', true)

    expect(heroVitals(carry!, simulation.queries.auras.entities)).toMatchObject({
      health: 0,
      healthRegen: 0,
    })

    simulation.dispose()
  })
})
