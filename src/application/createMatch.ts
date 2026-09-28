import { randomIds, type IdGenerator } from '@/core/ids'
import { OPPONENT, type Difficulty } from '@/content/rules'
import { createRng } from '@/core/random/rng'
import type { CoachStrategy } from '@/domain/coach/CoachStrategy'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { Match, type MatchState, type RemoteLink, type Rival } from '@/domain/match/Match'

export interface MatchOptions {
  readonly seed?: string
  readonly ids?: IdGenerator
  readonly opponentCoach?: CoachStrategy
  /** Picks how strong the computer opponent plays; standard when omitted. */
  readonly difficulty?: Difficulty
  /** Plays against a person on another device instead of the computer. */
  readonly link?: RemoteLink
}

function rivalFor(options: Omit<MatchOptions, 'seed'>): Rival {
  if (options.link) {
    return {
      kind: 'remote',
      link: options.link,
    }
  }

  return {
    kind: 'coach',
    coach: options.opponentCoach ?? new GreedyCoach(undefined, OPPONENT[options.difficulty ?? 'standard']),
  }
}

export function createMatch(options: MatchOptions = {}) {
  return new Match({
    rng: createRng(options.seed),
    ids: options.ids ?? randomIds,
    rival: rivalFor(options),
  })
}

export function restoreMatch(state: MatchState, options: Omit<MatchOptions, 'seed'> = {}) {
  return new Match(
    {
      rng: createRng(undefined, state.rng),
      ids: options.ids ?? randomIds,
      rival: rivalFor({
        ...options,
        link: state.link,
      }),
    },
    state,
  )
}
