import type { Rng } from '@/core/random/rng'
import type { Player } from '../player/Player'

export interface CoachContext {
  readonly round: number
  readonly rng: Rng
}

export interface CoachStrategy {
  playTurn(player: Player, context: CoachContext): void
}
