import type { PlayerState } from '@/domain/player/Player'
import { DuelError, type DuelService } from './duels'

interface WaitingBoard {
  readonly duelId: string
  readonly round: number
  readonly board: PlayerState
  readonly resolve: (board: unknown) => void
  readonly reject: (error: Error) => void
  submitted: boolean
  /** The request on its way, if any; a withdrawal waits for it so a late submit cannot undo it. */
  request: Promise<void> | null
  /** Set while the board is being taken back: no new request goes out meanwhile. */
  withdrawing: boolean
}

/** The coach took their board back to plan on; the wait for the other board ends with this. */
export class BoardWithdrawn extends Error {
  constructor() {
    super('The board was taken back')
  }
}

/** Retry the same immutable board after a lost response; submit_board is idempotent on the server. */
export class BoardExchange {
  private pending: WaitingBoard | null = null

  constructor(
    private readonly service: Pick<DuelService, 'submitBoard' | 'opponentBoard' | 'withdrawBoard'>,
    private readonly connectionChanged: (recovering: boolean) => void,
  ) {}

  matches(duelId: string, round: number) {
    return this.pending?.duelId === duelId && this.pending.round === round
  }

  wait(duelId: string, round: number, board: PlayerState) {
    this.cancel('another round started')

    const result = new Promise<unknown>((resolve, reject) => {
      this.pending = {
        duelId,
        round,
        board,
        resolve,
        reject,
        submitted: false,
        request: null,
        withdrawing: false,
      }
    })

    void this.retry()

    return result
  }

  /** Sends the board, or asks for the other one once it is sent; a request already on its way is not doubled. */
  retry() {
    const waiting = this.pending
    if (!waiting || waiting.request || waiting.withdrawing) {
      return Promise.resolve()
    }

    waiting.request = this.send(waiting)

    return waiting.request
  }

  /**
   * Takes the board back while the other coach is still planning. Resolves true when it was taken back, and the
   * wait for the other board ends with `BoardWithdrawn`; false when the other board is in and the round goes ahead.
   */
  async withdraw() {
    const waiting = this.pending
    if (!waiting || waiting.withdrawing) {
      return false
    }

    waiting.withdrawing = true

    try {
      await waiting.request

      if (this.pending !== waiting) {
        return false
      }

      const taken = await this.service.withdrawBoard(waiting.duelId, waiting.round)
      if (taken && this.pending === waiting) {
        this.pending = null
        this.connectionChanged(false)
        waiting.reject(new BoardWithdrawn())
      }

      return taken
    } finally {
      waiting.withdrawing = false

      if (this.pending === waiting) {
        void this.retry()
      }
    }
  }

  cancel(reason: string) {
    this.pending?.reject(new Error(reason))
    this.pending = null
    this.connectionChanged(false)
  }

  private async send(waiting: WaitingBoard) {
    try {
      const theirs = waiting.submitted
        ? await this.service.opponentBoard(waiting.duelId, waiting.round)
        : await this.service.submitBoard(waiting.duelId, waiting.round, waiting.board)

      if (this.pending !== waiting) {
        return
      }

      waiting.submitted = true
      this.connectionChanged(false)

      if (theirs !== null) {
        this.pending = null
        waiting.resolve(theirs)
      }
    } catch (error) {
      if (this.pending !== waiting) {
        return
      }

      if (error instanceof DuelError && error.reason !== 'failed' && error.reason !== 'rateLimited') {
        this.pending = null
        this.connectionChanged(false)
        waiting.reject(error)
      } else {
        this.connectionChanged(true)
      }
    } finally {
      waiting.request = null
    }
  }
}
