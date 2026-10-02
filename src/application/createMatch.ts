import { randomIds, type IdGenerator } from '@/core/ids'
import { trialById, type TrialId } from '@/content/career'
import type { ModeId } from '@/content/ids'
import { DEFAULT_MODE } from '@/content/modes'
import { opponentStyleFor, type Difficulty } from '@/content/rules'
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
  readonly mode?: ModeId
  readonly trialId?: TrialId
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
    coach:
      options.opponentCoach ??
      new GreedyCoach(
        undefined,
        opponentStyleFor(options.mode ?? DEFAULT_MODE, options.difficulty ?? 'standard'),
      ),
  }
}

export function createMatch(options: MatchOptions = {}) {
  const trial = !options.link && options.trialId ? trialById(options.trialId) : null

  return new Match({
    rng: createRng(options.seed ?? (trial ? `career-trial-v1:${trial.id}` : undefined)),
    ids: options.ids ?? randomIds,
    rival: rivalFor({
      ...options,
      mode: trial?.mode ?? options.mode,
      difficulty: trial ? 'standard' : options.difficulty,
    }),
    mode: trial?.mode ?? options.mode ?? DEFAULT_MODE,
    ...(trial ? { trialId: trial.id } : {}),
  })
}

export function restoreMatch(state: MatchState, options: Omit<MatchOptions, 'seed'> = {}) {
  return new Match(
    {
      rng: createRng(undefined, state.rng),
      ids: options.ids ?? randomIds,
      rival: rivalFor({
        ...options,
        mode: state.mode,
        ...(state.trialId ? { difficulty: 'standard' } : {}),
        link: state.link,
      }),
      mode: state.mode,
      ...(state.trialId ? { trialId: state.trialId } : {}),
    },
    state,
  )
}
