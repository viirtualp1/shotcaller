import type { PlayerState } from '@/domain/player/Player'
import { DuelError, type DuelService } from './duels'

interface WaitingBoard {
  readonly duelId: string
  readonly round: number
  readonly board: PlayerState
  readonly resolve: (board: unknown) => void
  readonly reject: (error: Error) => void
  submitted: boolean
  busy: boolean
}

/** Retry the same immutable board after a lost response; submit_board is idempotent on the server. */
export class BoardExchange {
  private pending: WaitingBoard | null = null

  constructor(
    private readonly service: Pick<DuelService, 'submitBoard' | 'opponentBoard'>,
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
        busy: false,
      }
    })

    void this.retry()

    return result
  }

  async retry() {
    const waiting = this.pending
    if (!waiting || waiting.busy) {
      return
    }

    waiting.busy = true

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
      waiting.busy = false
    }
  }

  cancel(reason: string) {
    this.pending?.reject(new Error(reason))
    this.pending = null
    this.connectionChanged(false)
  }
}
