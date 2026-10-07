import { randomIds, type IdGenerator } from '@/core/ids'
import { trialById, type TrialId } from '@/content/career'
import type { ModeId } from '@/content/ids'
import { DEFAULT_MODE } from '@/content/modes'
import { opponentStyleFor, type Difficulty } from '@/content/rules'
import type { MatchRules } from '@/content/experiments'
import type { SandboxSettings } from '@/content/sandbox'
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
  /** Opens the training ground: dummies on the other side, and gold that never runs out. */
  readonly sandbox?: SandboxSettings
  /** Experiments; they apply only against the computer, outside career trials. */
  readonly rules?: MatchRules
}

function rivalFor(options: Omit<MatchOptions, 'seed'>): Rival {
  if (options.sandbox) {
    return {
      kind: 'sandbox',
      settings: options.sandbox,
    }
  }

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
  const solo = !trial && !options.link && !options.sandbox

  let rules = options.rules
  if (solo && options.difficulty === 'hard') {
    rules = {
      rotation: true,
      twists: true,
    }
  }

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
    ...(rules && solo ? { rules } : {}),
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
        sandbox: state.sandbox,
      }),
      mode: state.mode,
      ...(state.trialId ? { trialId: state.trialId } : {}),
      ...(state.rules ? { rules: state.rules } : {}),
    },
    state,
  )
}
