import type { MatchPhase } from '@/domain/match/Match'
import type { PresencePayload } from './protocol'

export interface PresenceCopy {
  readonly playing: string
  readonly inGame: string
  readonly training: string
  readonly duel: string
  readonly versus: string
  readonly finished: string
  planning(round: number): string
  battle(round: number): string
  summary(round: number): string
}

export interface PresenceScene {
  readonly phase: MatchPhase
  readonly round: number
  readonly sandbox: boolean
  readonly duel: boolean
}

/** Menu text when nothing is being played, and a round line once a match is open. */
export function presenceFor(scene: PresenceScene | null, text: PresenceCopy): PresencePayload {
  if (!scene) {
    return {
      details: text.playing,
      state: text.inGame,
    }
  }

  if (scene.phase === 'finished') {
    return {
      details: text.finished,
      state: text.inGame,
    }
  }

  let details = text.versus

  if (scene.sandbox) {
    details = text.training
  } else if (scene.duel) {
    details = text.duel
  }

  let state = text.planning(scene.round)

  if (scene.phase === 'battle') {
    state = text.battle(scene.round)
  } else if (scene.phase === 'summary') {
    state = text.summary(scene.round)
  }

  return {
    details,
    state,
  }
}
