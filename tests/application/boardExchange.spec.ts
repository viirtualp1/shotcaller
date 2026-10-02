import { describe, expect, it, vi } from 'vitest'
import { BoardExchange, BoardWithdrawn } from '@/application/social/BoardExchange'
import { DuelError } from '@/application/social/duels'
import type { PlayerState } from '@/domain/player/Player'

const board = { name: 'immutable board' } as unknown as PlayerState
const theirs = { name: 'opponent board' }
function fixture() {
  const service = {
    submitBoard: vi.fn(async (): Promise<unknown> => null),
    opponentBoard: vi.fn(async (): Promise<unknown> => null),
    withdrawBoard: vi.fn(async () => true),
  }

  const changed = vi.fn()
  return {
    service,
    changed,
    exchange: new BoardExchange(service, changed),
  }
}

describe('duel board recovery', () => {
  it('resubmits the identical board after a response is lost and then polls without resending', async () => {
    const { exchange, service, changed } = fixture()
    service.submitBoard.mockRejectedValueOnce(new DuelError('failed'))
    const result = exchange.wait('duel', 3, board)
    await exchange.retry()
    expect(changed).toHaveBeenLastCalledWith(true)
    await exchange.retry()
    expect(service.submitBoard).toHaveBeenCalledTimes(2)
    expect(service.submitBoard).toHaveBeenLastCalledWith('duel', 3, board)
    service.opponentBoard.mockResolvedValueOnce(theirs)
    await exchange.retry()
    expect(await result).toBe(theirs)
    expect(changed).toHaveBeenLastCalledWith(false)
  })

  it('recovers a board when realtime missed it, including after failed polls', async () => {
    const { exchange, service } = fixture()
    const result = exchange.wait('duel', 3, board)
    await exchange.retry()
    service.opponentBoard.mockRejectedValueOnce(new DuelError('failed'))
    await exchange.retry()
    service.opponentBoard.mockResolvedValueOnce(theirs)
    await exchange.retry()
    expect(await result).toBe(theirs)
    expect(service.submitBoard).toHaveBeenCalledTimes(1)
  })

  it('does not overlap requests during slow uploads or repeated realtime events', async () => {
    const { exchange, service } = fixture()
    let finish!: (board: unknown) => void
    service.submitBoard.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )

    const result = exchange.wait('duel', 3, board)
    await Promise.all([exchange.retry(), exchange.retry(), exchange.retry()])
    expect(service.submitBoard).toHaveBeenCalledTimes(1)
    finish(theirs)
    expect(await result).toBe(theirs)
  })

  it.each(['gone', 'forbidden', 'wrongRound'] as const)(
    'stops retrying a permanent %s error',
    async (reason) => {
      const { exchange, service } = fixture()
      service.submitBoard.mockRejectedValueOnce(new DuelError(reason))
      await expect(exchange.wait('duel', 3, board)).rejects.toMatchObject({ reason })
      await exchange.retry()
      expect(service.submitBoard).toHaveBeenCalledTimes(1)
    },
  )

  it('takes the board back while the other coach is still planning', async () => {
    const { exchange, service } = fixture()
    const result = exchange.wait('duel', 3, board)
    const withdrawn = expect(result).rejects.toBeInstanceOf(BoardWithdrawn)

    expect(await exchange.withdraw()).toBe(true)
    await withdrawn
    expect(service.withdrawBoard).toHaveBeenCalledWith('duel', 3)
    expect(exchange.matches('duel', 3)).toBe(false)
  })

  it('waits for a board still on its way before taking it back, so it cannot land afterwards', async () => {
    const { exchange, service } = fixture()
    let finish!: (board: unknown) => void
    service.submitBoard.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )

    const result = exchange.wait('duel', 3, board)
    const withdrawn = expect(result).rejects.toBeInstanceOf(BoardWithdrawn)
    const withdrawal = exchange.withdraw()
    await Promise.resolve()
    expect(service.withdrawBoard).not.toHaveBeenCalled()

    finish(null)
    expect(await withdrawal).toBe(true)
    await withdrawn
    expect(service.submitBoard).toHaveBeenCalledTimes(1)
  })

  it('starts the round when the other board was already in', async () => {
    const { exchange, service } = fixture()
    service.withdrawBoard.mockResolvedValueOnce(false)
    const result = exchange.wait('duel', 3, board)
    await exchange.retry()

    service.opponentBoard.mockResolvedValueOnce(theirs)
    expect(await exchange.withdraw()).toBe(false)
    expect(await result).toBe(theirs)
  })

  it('ignores late responses and failures after leaving the duel', async () => {
    const { exchange, service, changed } = fixture()
    let reject!: (error: Error) => void
    service.submitBoard.mockReturnValueOnce(
      new Promise((_resolve, fail) => {
        reject = fail
      }),
    )

    const result = exchange.wait('duel', 3, board)
    const rejected = expect(result).rejects.toThrow('left')
    exchange.cancel('left')
    reject(new DuelError('failed'))
    await rejected
    await Promise.resolve()
    expect(changed).toHaveBeenLastCalledWith(false)
    expect(exchange.matches('duel', 3)).toBe(false)
    expect(service.opponentBoard).not.toHaveBeenCalled()
  })
})
