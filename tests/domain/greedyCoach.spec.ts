import { describe, expect, it } from 'vitest'
import { createMatch, restoreMatch } from '@/application/createMatch'
import { opponentStyleFor, OPPONENT } from '@/content/rules'
import { sequentialIds } from '@/core/ids'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { createRng } from '@/core/random/rng'
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
  }, 20_000)

  it('equips earlier on the standard bridge, including after restoring a match', () => {
    const original = createMatch({
      mode: 'oneLane',
      seed: 'bridge-items',
      ids: sequentialIds(),
    })

    const state = original.snapshot()
    const bot = state.players[1]

    const restored = restoreMatch({
      ...state,
      phase: 'summary',
      players: [
        state.players[0],
        {
          ...bot,
          gold: 20,
        },
      ],
    })

    restored.nextRound()._unsafeUnwrap()

    expect(restored.opponent.ledger.itemsBought).toBeGreaterThan(0)
    expect(restored.opponent.roster.boardHeroes().some((hero) => hero.items.length > 0)).toBe(true)
    expect(opponentStyleFor('oneLane', 'relaxed')).toEqual(OPPONENT.relaxed)
    expect(opponentStyleFor('twoLanes', 'standard')).toEqual(OPPONENT.standard)
  })

  it('buys and equips one item before it spends the round on the shop', () => {
    const match = createMatch({
      seed: 'items',
      ids: sequentialIds('items'),
    })

    const opponent = match.opponent
    opponent.wallet.earn(20)

    new GreedyCoach(undefined, {
      itemsFromRound: 3,
      goldReserveForItems: 4,
      levelFromRound: Infinity,
      rerollFromRound: Infinity,
      maxRerolls: 0,
    }).playTurn(opponent, {
      round: 3,
      rng: createRng('items'),
    })

    expect(opponent.ledger.itemsBought).toBe(1)
    expect(opponent.wallet.gold).toBeGreaterThanOrEqual(4)
    expect(opponent.roster.boardHeroes().flatMap((hero) => hero.items)).toHaveLength(1)
  })
})
