import { randomIds, type IdGenerator } from '@/core/ids'
import { OPPONENT, type Difficulty } from '@/content/rules'
import { createRng } from '@/core/random/rng'
import type { CoachStrategy } from '@/domain/coach/CoachStrategy'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { Match, type MatchState } from '@/domain/match/Match'

export interface MatchOptions {
  readonly seed?: string
  readonly ids?: IdGenerator
  readonly opponentCoach?: CoachStrategy
  /** Picks how strong the computer opponent plays; standard when omitted. */
  readonly difficulty?: Difficulty
}

const opponentFor = (options: Omit<MatchOptions, 'seed'>) =>
  options.opponentCoach ?? new GreedyCoach(undefined, OPPONENT[options.difficulty ?? 'standard'])

export function createMatch(options: MatchOptions = {}) {
  return new Match({
    rng: createRng(options.seed),
    ids: options.ids ?? randomIds,
    opponentCoach: opponentFor(options),
  })
}

export function restoreMatch(state: MatchState, options: Omit<MatchOptions, 'seed'> = {}) {
  return new Match(
    {
      rng: createRng(undefined, state.rng),
      ids: options.ids ?? randomIds,
      opponentCoach: opponentFor(options),
    },
    state,
  )
}
