import { describe, expect, it } from 'vitest'
import type { HeroId } from '@/content/ids'
import { freshStructures } from '@/domain/match/structures'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import type { Unit } from '@/simulation/ecs/components'
import { inReach } from '@/simulation/systems/AttackSystem'

/** Frames where the hero, hit by an enemy hero it could hit back from where it stands, attacks something else. */
function ignoredFrames(heroId: HeroId, seed: string) {
  const simulation = new BattleSimulation({
    mode: 'threeLanes',
    round: 3,
    seed,
    lineups: [
      {
        top: [],
        mid: [
          {
            uid: 'mine',
            heroId,
            stars: 1,
            items: ['staff', 'chalice'],
          },
        ],
        bot: [],
      },
      {
        top: [],
        mid: [
          {
            uid: 'theirs',
            heroId,
            stars: 1,
            items: [],
          },
        ],
        bot: [],
      },
    ],
    structures: [freshStructures(), freshStructures()],
  })

  let ignored = 0
  while (!simulation.isOver) {
    simulation.step()

    const mine = simulation.world.entities.find((e) => e.hero?.uid === 'mine')
    const attacker = mine?.threat?.attacker
    if (
      !mine ||
      !attacker ||
      mine.threat!.remaining <= 0 ||
      mine.health!.current <= 0 ||
      attacker.health!.current <= 0 ||
      mine.status!.stun > 0
    ) {
      continue
    }

    if (inReach(mine as Unit, attacker) && mine.targeting!.target !== attacker) {
      ignored++
    }
  }

  return ignored
}

describe('answering an enemy hero', () => {
  /* Mirror matches in mid, where a ranged hero used to farm creeps while the other shot it from beside its tower. */
  it.each([
    ['oracle', 'oracle-c'],
    ['warden', 'warden-c'],
    ['acolyte', 'acolyte-c'],
  ] as const)(
    '%s hits back an attacker within its own reach, even beside the enemy tower',
    (heroId, seed) => {
      // A frame or two pass between a hit landing and the next target choice.
      expect(ignoredFrames(heroId, seed)).toBeLessThanOrEqual(10)
    },
  )
})
