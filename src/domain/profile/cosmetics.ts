import { COACH_PATH, type FrameId, type TitleId } from '@/content/progression'
import type { HeroRecord } from './Profile'
import { levelFor } from './progression'

export interface Cosmetics {
  readonly frames: readonly FrameId[]
  readonly titles: readonly TitleId[]
  readonly frame: FrameId | null
  readonly title: TitleId | null
}

/** Reconcile old accounts and new XP without removing a previously earned cosmetic. */
export function cosmeticsFor(xp: number, previous?: Cosmetics): Cosmetics {
  const unlocked = COACH_PATH.filter((step) => step.level <= levelFor(xp).level)
  return {
    frames: [...new Set([...(previous?.frames ?? []), ...unlocked.flatMap((step) => step.reward.kind === 'frame' ? [step.reward.id] : [])])],
    titles: [...new Set([...(previous?.titles ?? []), ...unlocked.flatMap((step) => step.reward.kind === 'title' ? [step.reward.id] : [])])],
    frame: previous?.frame ?? null,
    title: previous?.title ?? null,
  }
}

export const MASTERY_STEPS = [
  { matches: 3, wins: 1 }, { matches: 10, wins: 3 }, { matches: 25, wins: 10 },
  { matches: 50, wins: 20 }, { matches: 100, wins: 50 },
] as const

/** Mastery is separate from the stars a hero earns inside a match. */
export function heroMastery(record?: Pick<HeroRecord, 'matches' | 'wins'>) {
  return record ? MASTERY_STEPS.filter((step) => record.matches >= step.matches && record.wins >= step.wins).length : 0
}
