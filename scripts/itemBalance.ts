import { parseArgs } from 'node:util'
import { HERO_IDS, type ItemId } from '@/content/ids'
import { BATTLE } from '@/content/rules'
import { TRAINING_CAMPS } from '@/content/sandbox'
import { freshStructures } from '@/domain/match/structures'
import { BattleSimulation } from '@/simulation/BattleSimulation'

/** Fixed, unarmored targets: compare offense without movement, draft or survival changing the result. */
const { values } = parseArgs({
  options: {
    seconds: {
      type: 'string',
      default: '60',
    },
  },
})

const seconds = Number(values.seconds)

const loadouts: Readonly<Record<string, readonly ItemId[]>> = {
  plain: [],
  haste: ['gloves', 'gloves'],
  spells: ['staff', 'manaStone'],
  power: ['staff', 'staff'],
  mana: ['manaStone', 'manaStone'],
}

for (const heroId of HERO_IDS) {
  const scores: Record<string, { damage: number; casts: number }> = {}
  for (const [name, items] of Object.entries(loadouts)) {
    const simulation = new BattleSimulation({
      mode: 'oneLane',
      round: 1,
      seed: 'item-balance',
      lineups: [
        {
          top: [],
          mid: [
            {
              uid: 'test',
              heroId,
              stars: 1,
              items: [...items],
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
    const [x, y] = TRAINING_CAMPS.oneLane.mid!
    Object.assign(hero.position, {
      x: x - 25,
      y,
    })

    simulation.world.removeComponent(hero, 'laneFollower')
    simulation.world.removeComponent(hero, 'roamer')

    let casts = 0
    let damage = 0
    simulation.events.on('abilityCast', () => casts++)

    simulation.events.on('damaged', (event) => {
      if (event.source === hero || event.source.owner === hero) {
        damage += event.amount
      }
    })

    for (let elapsed = 0; elapsed < seconds; elapsed += BATTLE.step) {
      simulation.step()
    }

    scores[name] = {
      damage: Math.round(damage),
      casts,
    }

    simulation.dispose()
  }

  console.log(heroId.padEnd(14), JSON.stringify(scores))
}
