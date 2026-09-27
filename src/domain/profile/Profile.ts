import {
  LANE_IDS,
  type HeroId,
  type ItemId,
  type LaneId,
  type StarLevel,
  type SynergyId,
} from '@/content/ids'
import { PROFILE } from '@/content/profile'
import type { Difficulty } from '@/content/rules'
import type { MatchResult } from '../match/judge'
import type { Match } from '../match/Match'
import type { MatchStats } from '../match/matchStats'
import type { Lineup } from '../roster/Roster'
import { resolveLane } from '../synergy/resolveLane'
import { matchXp, ratingChange, verdictOf, type Verdict } from './progression'

export interface HeroRecord {
  readonly matches: number
  readonly wins: number
  readonly kills: number
  readonly deaths: number
  readonly damage: number
  readonly bestStars: StarLevel
}

export interface SynergyRecord {
  readonly matches: number
  readonly wins: number
}

export interface LineupHero {
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly lane: LaneId
  readonly items: readonly ItemId[]
}

export interface MatchHeroLine {
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly kills: number
  readonly deaths: number
  readonly damage: number
}

/** One finished match as the profile remembers it. */
export interface MatchRecord {
  readonly id: string
  /** ISO date and time. */
  readonly playedAt: string
  readonly difficulty: Difficulty
  readonly verdict: Verdict
  readonly reason: MatchResult['reason']
  readonly rounds: number
  readonly roundsWon: number
  readonly roundsLost: number
  /** The lineup that fought the last round. */
  readonly lineup: readonly LineupHero[]
  readonly synergies: readonly SynergyId[]
  readonly heroes: readonly MatchHeroLine[]
  readonly mvp: HeroId | null
  readonly towersDestroyed: number
  readonly goldEarned: number
  readonly ratingBefore: number
  readonly ratingAfter: number
  readonly xp: number
}

export interface ProfileTotals {
  readonly matches: number
  readonly wins: number
  readonly losses: number
  readonly draws: number
  /** Wins by breaking the enemy throne. */
  readonly throneWins: number
  readonly roundsPlayed: number
  readonly heroKills: number
  /** Positive for wins in a row, negative for losses in a row. */
  readonly streak: number
  readonly bestWinStreak: number
  /** Fewest rounds a win took. */
  readonly fastestWin: number | null
}

export interface Profile {
  readonly name: string
  /** `null` falls back to the most played hero. */
  readonly avatar: HeroId | null
  readonly createdAt: string
  readonly rating: number
  readonly peakRating: number
  readonly xp: number
  readonly totals: ProfileTotals
  readonly heroes: Partial<Record<HeroId, HeroRecord>>
  readonly synergies: Partial<Record<SynergyId, SynergyRecord>>
  /** Newest first. */
  readonly recent: readonly MatchRecord[]
}

/** What the profile needs from a match once it is over. */
export interface FinishedMatch {
  readonly difficulty: Difficulty
  readonly result: MatchResult
  readonly stats: MatchStats
  readonly lineup: Lineup
  readonly towersDestroyed: number
}

export const createProfile = (createdAt: string): Profile => ({
  name: '',
  avatar: null,
  createdAt,
  rating: 0,
  peakRating: 0,
  xp: 0,
  totals: {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    throneWins: 0,
    roundsPlayed: 0,
    heroKills: 0,
    streak: 0,
    bestWinStreak: 0,
    fastestWin: null,
  },
  heroes: {},
  synergies: {},
  recent: [],
})

export function finishedMatch(match: Match, difficulty: Difficulty): FinishedMatch | null {
  if (!match.result) {
    return null
  }

  return {
    difficulty,
    result: match.result,
    stats: match.stats,
    lineup: match.human.roster.lineup(),
    towersDestroyed: LANE_IDS.filter((lane) => match.structures[1][lane] <= 0).length,
  }
}

/** Most played first, ties broken by wins. */
export const heroesByPlays = (profile: Profile) =>
  (Object.entries(profile.heroes) as [HeroId, HeroRecord][]).sort(
    ([, a], [, b]) => b.matches - a.matches || b.wins - a.wins,
  )

export const avatarOf = (profile: Profile): HeroId =>
  profile.avatar ?? heroesByPlays(profile)[0]?.[0] ?? 'spearman'

const add = <K extends string, V>(
  records: Partial<Record<K, V>>,
  key: K,
  update: (before: V | undefined) => V,
): Partial<Record<K, V>> => ({
  ...records,
  [key]: update(records[key]),
})

export function recordMatch(
  profile: Profile,
  finished: FinishedMatch,
  meta: { id: string; playedAt: string },
) {
  const verdict = verdictOf(finished.result)
  const won = verdict === 'win'
  const { stats } = finished
  const roundsWon = stats.teams[0].roundsWon

  const lineup = LANE_IDS.flatMap((lane) =>
    finished.lineup[lane].map((hero) => ({
      heroId: hero.heroId,
      stars: hero.stars,
      lane,
      items: [...hero.items],
    })),
  )

  const synergies = [
    ...new Set(
      LANE_IDS.flatMap(
        (lane) =>
          resolveLane(
            lane,
            finished.lineup[lane].map((h) => h.heroId),
          ).synergies,
      ),
    ),
  ]

  const heroes = stats.heroes
    .filter((h) => h.team === 0)
    .sort((a, b) => b.damageDealt - a.damageDealt)
    .map((h) => ({
      heroId: h.heroId,
      stars: h.bestStars,
      kills: h.kills,
      deaths: h.deaths,
      damage: h.damageDealt,
    }))

  const rating = Math.max(0, profile.rating + ratingChange(finished.result, finished.difficulty))
  const xp = matchXp(verdict, roundsWon)

  const record: MatchRecord = {
    ...meta,
    difficulty: finished.difficulty,
    verdict,
    reason: finished.result.reason,
    rounds: stats.rounds,
    roundsWon,
    roundsLost: stats.teams[1].roundsWon,
    lineup,
    synergies,
    heroes,
    mvp: heroes[0]?.heroId ?? null,
    towersDestroyed: finished.towersDestroyed,
    goldEarned: stats.teams[0].income.total,
    ratingBefore: profile.rating,
    ratingAfter: rating,
    xp,
  }

  const before = profile.totals

  const streak = won
    ? Math.max(before.streak, 0) + 1
    : verdict === 'loss'
      ? Math.min(before.streak, 0) - 1
      : 0

  const totals: ProfileTotals = {
    matches: before.matches + 1,
    wins: before.wins + (won ? 1 : 0),
    losses: before.losses + (verdict === 'loss' ? 1 : 0),
    draws: before.draws + (verdict === 'draw' ? 1 : 0),
    throneWins: before.throneWins + (won && record.reason === 'throne' ? 1 : 0),
    roundsPlayed: before.roundsPlayed + stats.rounds,
    heroKills: before.heroKills + stats.teams[0].heroKills,
    streak,
    bestWinStreak: Math.max(before.bestWinStreak, streak),
    fastestWin: won ? Math.min(before.fastestWin ?? Infinity, stats.rounds) : before.fastestWin,
  }

  let heroRecords = profile.heroes
  for (const line of heroes) {
    heroRecords = add(heroRecords, line.heroId, (h) => ({
      matches: (h?.matches ?? 0) + 1,
      wins: (h?.wins ?? 0) + (won ? 1 : 0),
      kills: (h?.kills ?? 0) + line.kills,
      deaths: (h?.deaths ?? 0) + line.deaths,
      damage: (h?.damage ?? 0) + line.damage,
      bestStars: Math.max(h?.bestStars ?? 1, line.stars) as StarLevel,
    }))
  }

  let synergyRecords = profile.synergies
  for (const id of synergies) {
    synergyRecords = add(synergyRecords, id, (s) => ({
      matches: (s?.matches ?? 0) + 1,
      wins: (s?.wins ?? 0) + (won ? 1 : 0),
    }))
  }

  return {
    record,
    profile: {
      ...profile,
      rating,
      peakRating: Math.max(profile.peakRating, rating),
      xp: profile.xp + xp,
      totals,
      heroes: heroRecords,
      synergies: synergyRecords,
      recent: [record, ...profile.recent].slice(0, PROFILE.recentMatches),
    } satisfies Profile,
  }
}
