import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { sequentialIds } from '@/core/ids'
import { headlessResolver } from '@/simulation/BattleSimulation'

describe('GreedyCoach', () => {
  it('never opens with a promoted hero', () => {
    for (let i = 0; i < 200; i++) {
      const seed = `opening-${i}`

      for (const difficulty of ['relaxed', 'standard'] as const) {
        const match = createMatch({
          seed,
          ids: sequentialIds(seed),
          difficulty,
        })

        expect(match.opponent.roster.all().every((hero) => hero.stars === 1)).toBe(true)
      }
    }
  })

  it('does not reroll on the relaxed difficulty', () => {
    const match = createMatch({
      seed: 'relaxed',
      ids: sequentialIds('relaxed'),
      difficulty: 'relaxed',
    })

    while (match.phase !== 'finished') {
      match.finishBattle(
        headlessResolver.resolve(match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()),
      )

      match.nextRound()
    }

    expect(match.opponent.ledger.rerolls).toBe(0)
    expect(match.opponent.ledger.heroesBought).toBeGreaterThan(0)
  })
})
