import {
  ACHIEVEMENTS,
  CONTRACTS,
  TRIALS,
  trialById,
  type AchievementId,
  type ContractDefinition,
  type ContractId,
  type TrialId,
} from '@/content/career'
import { ITEM_SLOTS } from '@/content/items'
import type { MatchRecord, Profile } from './Profile'
import { levelFor } from './progression'

export type CareerReward =
  | { readonly kind: 'achievement'; readonly id: AchievementId; readonly xp: number }
  | { readonly kind: 'weekly'; readonly id: ContractId; readonly xp: number }
  | { readonly kind: 'trial'; readonly id: TrialId; readonly xp: number }

export interface WeeklyProgress {
  readonly progress: Readonly<Record<ContractId, number>>
  readonly completed: Partial<Readonly<Record<ContractId, string>>>
}

export interface TrialRecord {
  readonly completedAt: string
  readonly bestRounds: number
}

export interface Career {
  readonly achievements: Partial<Readonly<Record<AchievementId, string>>>
  /** Kept by week so offline matches still count for the week they were actually played in. */
  readonly weeks: Readonly<Record<string, WeeklyProgress>>
  readonly trials: Partial<Readonly<Record<TrialId, TrialRecord>>>
}

export const emptyCareer = (): Career => ({
  achievements: {},
  weeks: {},
  trials: {},
})

const emptyWeekly = (): WeeklyProgress => ({
  progress: {
    matches: 0,
    rounds: 0,
    towers: 0,
    kills: 0,
    synergies: 0,
    upgrades: 0,
  },
  completed: {},
})

const DAY_MS = 86_400_000

/** A shared Monday 00:00 UTC boundary, independent of the device's time zone. */
export function careerWeek(date: string | Date) {
  const instant = new Date(date)
  const midnight = Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate())
  const monday = midnight - ((instant.getUTCDay() + 6) % 7) * DAY_MS

  return new Date(monday).toISOString().slice(0, 10)
}

export function nextCareerWeek(week: string) {
  return new Date(new Date(`${week}T00:00:00.000Z`).getTime() + 7 * DAY_MS)
}

/** Everyone sees the same three contracts; one always progresses by simply finishing matches. */
export function weeklyContracts(week: string): readonly ContractDefinition[] {
  const rotation = ['rounds', 'towers', 'kills', 'synergies', 'upgrades'] as const
  const index = Math.floor(new Date(`${week}T00:00:00.000Z`).getTime() / (7 * DAY_MS)) % rotation.length

  return [CONTRACTS.matches, CONTRACTS[rotation[index]!], CONTRACTS[rotation[(index + 2) % rotation.length]!]]
}

export const weeklyProgress = (career: Career, week: string) => career.weeks[week] ?? emptyWeekly()

export const earnedMatchXp = (record: MatchRecord) =>
  record.xp + record.rewards.reduce((sum, reward) => sum + reward.xp, 0)

export function achievementProgress(profile: Profile, id: AchievementId) {
  switch (id) {
    case 'regular':
      return profile.totals.matches
    case 'throneBreaker':
      return profile.totals.throneWins
    case 'explorer':
      return Object.values(profile.heroes).filter((hero) => hero && hero.matches > 0).length
    case 'strategist':
      return Object.values(profile.synergies).filter((synergy) => synergy && synergy.wins > 0).length
    case 'threeStar':
      return Object.values(profile.heroes).some((hero) => hero?.bestStars === 3) ? 1 : 0
  }
}

/** Legacy accounts keep their XP and immediately receive milestones they already earned. */
export function migrateCareer(profile: Omit<Profile, 'career'> & { readonly career?: Career }): Profile {
  if (profile.career) {
    return profile as Profile
  }

  const migrated: Profile = {
    ...profile,
    career: emptyCareer(),
  }

  const achievements: Partial<Record<AchievementId, string>> = {}
  let xp = 0

  for (const achievement of ACHIEVEMENTS) {
    if (achievementProgress(migrated, achievement.id) >= achievement.target) {
      achievements[achievement.id] = profile.createdAt
      xp += achievement.xp
    }
  }

  return {
    ...migrated,
    xp: profile.xp + xp,
    career: {
      ...migrated.career,
      achievements,
    },
  }
}

export function trialPassed(record: MatchRecord) {
  if (
    !record.trialId ||
    record.duel ||
    record.difficulty !== 'standard' ||
    record.verdict !== 'win' ||
    record.reason === 'forfeit' ||
    record.rounds === 0 ||
    record.mode !== trialById(record.trialId).mode
  ) {
    return false
  }

  switch (record.trialId) {
    case 'siege':
      return record.reason === 'throne'
    case 'synergy':
      return record.synergies.length >= 3
    case 'arsenal':
      return record.lineup.filter((hero) => hero.items.length === ITEM_SLOTS).length >= 3
    case 'threeFronts':
      return new Set(record.lineup.map((hero) => hero.lane)).size === 3 && record.synergies.length >= 3
  }
}

/** Settled from match data, so replaying an offline match in the cloud recomputes rewards fairly. */
export function advanceCareer(before: Profile, after: Profile, record: MatchRecord) {
  const rewards: CareerReward[] = []
  const achievements = { ...before.career.achievements }
  const weeks = { ...before.career.weeks }
  const trials = { ...before.career.trials }

  for (const achievement of ACHIEVEMENTS) {
    if (!achievements[achievement.id] && achievementProgress(after, achievement.id) >= achievement.target) {
      achievements[achievement.id] = record.playedAt

      rewards.push({
        kind: 'achievement',
        id: achievement.id,
        xp: achievement.xp,
      })
    }
  }

  // A forfeit or a match without a battle is not a completed contract or a trial.
  if (record.rounds > 0 && record.reason !== 'forfeit') {
    const week = careerWeek(record.playedAt)
    const previous = weeklyProgress(before.career, week)

    const progress = {
      matches: previous.progress.matches + 1,
      rounds: previous.progress.rounds + record.rounds,
      towers: previous.progress.towers + record.towersDestroyed,
      kills: previous.progress.kills + record.heroKills,
      synergies: previous.progress.synergies + (record.synergies.length >= 2 ? 1 : 0),
      upgrades:
        previous.progress.upgrades + (record.lineup.filter((hero) => hero.stars >= 2).length >= 2 ? 1 : 0),
    }

    const completed = { ...previous.completed }

    for (const contract of weeklyContracts(week)) {
      if (!completed[contract.id] && progress[contract.id] >= contract.target) {
        completed[contract.id] = record.playedAt

        rewards.push({
          kind: 'weekly',
          id: contract.id,
          xp: contract.xp,
        })
      }
    }

    weeks[week] = {
      progress,
      completed,
    }

    if (
      record.trialId &&
      levelFor(before.xp).level >= trialById(record.trialId).level &&
      trialPassed(record)
    ) {
      const trial = trialById(record.trialId)
      const previous = trials[trial.id]

      trials[trial.id] = {
        completedAt: previous?.completedAt ?? record.playedAt,
        bestRounds: Math.min(previous?.bestRounds ?? Infinity, record.rounds),
      }

      if (!previous) {
        rewards.push({
          kind: 'trial',
          id: trial.id,
          xp: trial.xp,
        })
      }
    }
  }

  const bonus = rewards.reduce((sum, reward) => sum + reward.xp, 0)
  const xp = after.xp + bonus
  const beforeLevel = levelFor(before.xp).level
  const afterLevel = levelFor(xp).level

  return {
    career: {
      achievements,
      weeks,
      trials,
    } satisfies Career,
    xp,
    rewards,
    beforeLevel,
    afterLevel,
    unlocked: TRIALS.filter((trial) => trial.level > beforeLevel && trial.level <= afterLevel),
  }
}
