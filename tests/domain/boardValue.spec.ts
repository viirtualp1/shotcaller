import { describe, expect, it } from 'vitest'
import { createMatch, restoreMatch } from '@/application/createMatch'
import { serializeSnapshot, parseSnapshot } from '@/application/persistence/snapshot'
import { affordableBoard, boardValue } from '@/domain/player/boardValue'
import type { PlayerState } from '@/domain/player/Player'

function remote() {
  return createMatch({
    seed: 'affordability',
    link: {
      seed: 'affordability',
      side: 0,
    },
  })
}

describe('remote board affordability', () => {
  it('accepts purchases and rerolls that conserve the starting gold', () => {
    const match = remote()
    const opponent = remote().human
    opponent.buy(0)._unsafeUnwrap()
    opponent.reroll()._unsafeUnwrap()
    const board = opponent.snapshot()

    expect(boardValue(board)).toBe(5)
    expect(match.receiveOpponent(board).isOk()).toBe(true)
  })

  it('rejects free star upgrades and items even when the board shape is valid', () => {
    const match = remote()
    const opponent = remote().human
    opponent.buy(0)._unsafeUnwrap()
    const board = opponent.snapshot()
    board.roster.bench[0]!.stars = 3

    expect(match.receiveOpponent(board)._unsafeUnwrapErr().code).toBe('invalidBoard')
    board.roster.bench[0]!.stars = 1
    board.roster.bench[0]!.items.push('aegis')
    expect(match.acceptsOpponent(board)).toBe(false)
    expect(match.awaitingOpponent).toBe(true)
  })

  it('requires XP purchases and counts their cost even at maximum level', () => {
    const match = remote()
    const opponent = remote().human
    opponent.buyXp()._unsafeUnwrap()
    expect(match.acceptsOpponent(opponent.snapshot())).toBe(true)

    const forged: PlayerState = {
      ...opponent.snapshot(),
      gold: 5,
    }

    expect(match.acceptsOpponent(forged)).toBe(false)

    expect(
      match.acceptsOpponent({
        ...forged,
        ledger: {
          ...forged.ledger,
          xpBought: 0,
        },
      }),
    ).toBe(false)
  })

  it('accepts item sale losses, passive XP and earned income without replaying a battle', () => {
    const match = remote()

    const previous = {
      ...match.opponent.snapshot(),
      gold: 20,
    }

    const paid = remote().human
    paid.restore(previous)
    paid.buyItem('broadsword')._unsafeUnwrap()
    paid.sellItem(0)._unsafeUnwrap()
    paid.prepareRound()

    expect(affordableBoard(paid.snapshot(), previous, 'threeLanes', 2)).toBe(true)

    expect(
      affordableBoard(
        {
          ...paid.snapshot(),
          xp: 2,
        },
        previous,
        'threeLanes',
        2,
      ),
    ).toBe(false)
  })

  it('keeps the verified budget through a save and rejects rewinding paid actions', () => {
    const match = remote()
    const opponent = remote().human
    opponent.reroll()._unsafeUnwrap()
    match.receiveOpponent(opponent.snapshot())._unsafeUnwrap()
    const restored = restoreMatch(parseSnapshot(serializeSnapshot(match.snapshot()))!)

    expect(restored.acceptsOpponent(opponent.snapshot())).toBe(true)
    const board = opponent.snapshot()
    expect(
      restored.acceptsOpponent({
        ...board,
        ledger: {
          ...board.ledger,
          rerolls: 0,
        },
      }),
    ).toBe(false)
  })
})
