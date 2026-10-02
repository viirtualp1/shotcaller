import { afterEach, describe, expect, it, vi } from 'vitest'
import { freshStructures } from '@/domain/match/structures'
import { EffectsLayer } from '@/rendering/layers/EffectsLayer'
import { Perspective } from '@/rendering/perspective'
import { PALETTE } from '@/rendering/theme'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import type { SimulationContext } from '@/simulation/SimulationContext'

const labels = vi.hoisted(() => [] as { text: string; color: number; size: number }[])

vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    killTweensOf: vi.fn(),
  },
}))

vi.mock('pixi.js', async (original) => {
  const pixi = await original<typeof import('pixi.js')>()

  return {
    ...pixi,
    Text: class extends pixi.Container {
      anchor = { set: vi.fn() }

      constructor(options: { text: string; style: { fill: number; fontSize: number } }) {
        super()

        labels.push({
          text: options.text,
          color: options.style.fill,
          size: options.style.fontSize,
        })
      }
    },
  }
})

afterEach(() => labels.splice(0))

function practice(side: 0 | 1 = 0) {
  const simulation = new BattleSimulation({
    mode: 'oneLane',
    round: 1,
    seed: 'combat-numbers',
    lineups: [
      {
        top: [],
        mid: [
          {
            uid: 'mage',
            heroId: 'pyromancer',
            stars: 1,
            items: ['vampireFang'],
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
    structures: [freshStructures('oneLane'), freshStructures('oneLane')],
    sandbox: {
      dummies: 1,
      creeps: false,
      endless: true,
    },
  })

  const layer = new EffectsLayer(
    {
      laneName: () => '',
      baseName: () => '',
      combatText: () => '',
    },
    vi.fn(),
    new Perspective(side),
  )

  layer.attach(simulation.events)

  const hero = simulation.queries.heroes.entities[0]!
  const dummy = simulation.queries.units.entities.find((unit) => unit.dummy)!
  const ctx = (simulation as unknown as { ctx: SimulationContext }).ctx

  return {
    simulation,
    layer,
    hero,
    dummy,
    ctx,
  }
}

describe('floating combat numbers', () => {
  it('shows low attack and spell damage on dummies in red, and both types of lifesteal in green', () => {
    const { simulation, layer, hero, dummy, ctx } = practice()
    hero.health.current -= 200

    ctx.combat.landAttack(hero, dummy, 20)
    ctx.combat.dealDamage(hero, dummy, 10, 'magical')

    expect(labels).toEqual([
      {
        text: '20',
        color: PALETTE.damage,
        size: 13,
      },
      {
        text: '+4',
        color: PALETTE.heal,
        size: 13,
      },
      {
        text: '10',
        color: PALETTE.damage,
        size: 13,
      },
      {
        text: '+1',
        color: PALETTE.heal,
        size: 13,
      },
    ])

    layer.detach()
    simulation.dispose()
  })

  it.each([0, 1] as const)('shows healing only for the viewer’s allies from side %s', (side) => {
    const { simulation, layer, hero } = practice(side)
    simulation.events.emit('healed', {
      target: {
        ...hero,
        team: 0,
      },
      amount: 5,
    })

    simulation.events.emit('healed', {
      target: {
        ...hero,
        team: 1,
      },
      amount: 6,
    })

    expect(labels).toEqual([
      {
        text: side === 0 ? '+5' : '+6',
        color: PALETTE.heal,
        size: 13,
      },
    ])

    layer.detach()
    simulation.dispose()
  })

  it('shows damage received by allies and critical damage in red, without zero hit numbers', () => {
    const { simulation, layer, hero, dummy } = practice()
    simulation.events.emit('damaged', {
      target: hero,
      source: dummy,
      amount: 12,
      type: 'physical',
      crit: false,
    })

    simulation.events.emit('damaged', {
      target: dummy,
      source: hero,
      amount: 60,
      type: 'magical',
      crit: true,
    })

    simulation.events.emit('damaged', {
      target: dummy,
      source: hero,
      amount: 0,
      type: 'physical',
      crit: false,
    })

    expect(labels).toEqual([
      {
        text: '12',
        color: PALETTE.damage,
        size: 13,
      },
      {
        text: '60!',
        color: PALETTE.damage,
        size: 17,
      },
    ])

    layer.detach()
    simulation.dispose()
  })
})
