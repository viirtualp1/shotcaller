import { describe, expect, it } from 'vitest'
import { freshStructures } from '@/domain/match/structures'
import { coresFirst } from '@/simulation/abilities/selectors'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import type { Unit } from '@/simulation/ecs/components'

const wounded = (role: 'support' | 'carry', ratio: number) =>
  ({
    hero: { role },
    health: {
      current: ratio * 500,
      max: 500,
    },
  }) as Unit

describe('supports', () => {
  it('heal and shield wounded cores before other supports', () => {
    const support = wounded('support', 0.2)
    const core = wounded('carry', 0.6)
    const weakerCore = wounded('carry', 0.4)

    expect(coresFirst([support, core, weakerCore])).toEqual([weakerCore, core, support])
  })

  it('walk the lane behind their core instead of leading it', () => {
    /* The Acolyte walks faster than the Sapper; with the lane to itself it would pull ahead. */
    const simulation = new BattleSimulation({
      mode: 'threeLanes',
      round: 3,
      seed: 'support-trail',
      lineups: [
        {
          top: [],
          mid: [
            {
              uid: 'support',
              heroId: 'acolyte',
              stars: 1,
              items: [],
            },
            {
              uid: 'core',
              heroId: 'sapper',
              stars: 1,
              items: [],
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
    })

    const hero = (uid: string) => simulation.queries.heroes.entities.find((h) => h.hero.uid === uid)!
    const along = (unit: Unit) => simulation.map.project(unit.laneFollower!.path, unit.position).along

    let lead = -Infinity
    for (let i = 0; i < 150; i++) {
      simulation.step()

      const support = hero('support')
      if (!support.targeting.target) {
        lead = Math.max(lead, along(support) - along(hero('core')))
      }
    }

    expect(lead).toBeLessThanOrEqual(0)
  })
})
