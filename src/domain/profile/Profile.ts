import { BALANCE_FINGERPRINT } from '@/content/balance'
import {
  LANE_IDS,
  MODE_IDS,
  type HeroId,
  type ItemId,
  type LaneId,
  type ModeId,
  type StarLevel,
  type SynergyId,
  type TeamId,
} from '@/content/ids'
import { MODES } from '@/content/modes'
import { PROFILE } from '@/content/profile'
import type { Difficulty } from '@/content/rules'
import { verdictFor, type MatchResult } from '../match/judge'
import type { Match } from '../match/Match'
import type { MatchStats, RoundLineups, RoundReplay } from '../match/matchStats'
import type { Lineup } from '../roster/Roster'
import { resolveLane } from '../synergy/resolveLane'
import type { TrialId } from '@/content/career'
import { advanceCareer, emptyCareer, type Career, type CareerReward } from './career'
import { matchXp, rankedRatingChange, verdictOf, type Verdict } from './progression'

export interface HeroRecord {
  readonly matches: number
  readonly wins: number
  readonly kills: number
  readonly deaths: number
  readonly damage: number
  readonly bestStars: StarLevel
  /** Matches that also recorded the stats below; older ones did not, so averages count only these. */
  readonly detailed: number
  readonly healing: number
  readonly structureDamage: number
  readonly damageReceived: number
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

/** One hero the coach fielded in a match; two copies of a hero have a line each. */
export interface MatchHeroLine {
  readonly heroId: HeroId
  readonly stars: StarLevel
  /** The lane it fought on last; missing on matches before 8.8. */
  readonly lane?: LaneId
  readonly kills: number
  readonly deaths: number
  readonly damage: number
  readonly healing: number
  readonly structureDamage: number
  readonly damageReceived: number
  readonly rounds: number
  readonly lastHits: number
}

/** One finished match as the profile remembers it. */
export interface MatchRecord {
  readonly id: string
  /** ISO date and time. */
  readonly playedAt: string
  readonly mode: ModeId
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
  /** The other side as the match ended; empty for matches recorded before it was kept. */
  readonly opponentLineup: readonly LineupHero[]
  readonly opponentSynergies: readonly SynergyId[]
  readonly opponentHeroes: readonly MatchHeroLine[]
  /** Who took each round, as the player saw it. */
  readonly history: readonly Verdict[]
  /** Both lineups of every round; only the latest matches keep them. */
  readonly roundLineups: readonly RoundLineups[]
  /** The team this profile's owner fought as. A replay runs the battle in that order. */
  readonly side: TeamId
  /** Balance the match was played on. A replay is offered only while the game still matches it. */
  readonly balance: string
  /** Seed and building health for each round, kept for as long as `roundLineups`. */
  readonly replays: readonly RoundReplay[]
  readonly mvp: HeroId | null
  /** Set for a duel with a friend; null for a match against the computer. */
  readonly duel: DuelInfo | null
  /** Hero kills by the whole team, towers and creeps included. */
  readonly heroKills: number
  readonly towersDestroyed: number
  readonly goldEarned: number
  readonly ratingBefore: number
  readonly ratingAfter: number
  readonly xp: number
  /** Base match XP stays separate from rewards, which cloud replay recomputes. */
  readonly rewards: readonly CareerReward[]
  readonly trialId: TrialId | null
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
  /** The touch camera demonstration has already been shown on this account. */
  readonly zoomHintSeen?: boolean
  /** One rating per game mode; only duels move them. */
  readonly ratings: ModeRatings
  readonly peakRatings: ModeRatings
  /** The best of the ratings: the rank friends see. Kept in the save for versions before game modes. */
  readonly rating: number
  readonly peakRating: number
  readonly xp: number
  readonly career: Career
  readonly totals: ProfileTotals
  readonly heroes: Partial<Record<HeroId, HeroRecord>>
  readonly synergies: Partial<Record<SynergyId, SynergyRecord>>
  /** Newest first. */
  readonly recent: readonly MatchRecord[]
}

export type ModeRatings = Readonly<Record<ModeId, number>>

export const emptyRatings = (): ModeRatings => ({
  threeLanes: 0,
  twoLanes: 0,
  oneLane: 0,
})

export const bestRating = (ratings: ModeRatings) => Math.max(...MODE_IDS.map((mode) => ratings[mode]))

/** Ratings as the server settled them from duels, with the best each mode reached. */
export interface SettledRatings {
  readonly ratings: ModeRatings
  readonly peaks: ModeRatings
}

/** The server has the final say on ratings: only duels it saw end count, whatever this device worked out. */
export const withSettledRatings = (profile: Profile, settled: SettledRatings): Profile => ({
  ...profile,
  ratings: settled.ratings,
  peakRatings: settled.peaks,
  rating: bestRating(settled.ratings),
  peakRating: bestRating(settled.peaks),
})

/** The mode of the best rating; the first mode wins a tie. */
export const bestMode = (ratings: ModeRatings) =>
  MODE_IDS.reduce((best, mode) => (ratings[mode] > ratings[best] ? mode : best))

/** A match against another coach; only these move the rating. */
export interface DuelInfo {
  /** Null in a friend's match: who they played stays private. */
  readonly opponentName: string | null
  readonly opponentRating?: number
  /** A matchmaking duel; a duel between friends leaves MMR as it was. */
  readonly ranked?: boolean
  readonly ghost?: boolean
}

/** What the profile needs from a match once it is over. */
export interface FinishedMatch {
  readonly mode: ModeId
  readonly difficulty: Difficulty
  readonly result: MatchResult
  readonly stats: MatchStats
  readonly lineup: Lineup
  readonly opponentLineup: Lineup
  readonly side: TeamId
  readonly towersDestroyed: number
  readonly duel: DuelInfo | null
  readonly trialId?: TrialId | null
}

export const createProfile = (createdAt: string): Profile => ({
  name: '',
  avatar: null,
  createdAt,
  ratings: emptyRatings(),
  peakRatings: emptyRatings(),
  rating: 0,
  peakRating: 0,
  xp: 0,
  career: emptyCareer(),
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

export function finishedMatch(
  match: Match,
  difficulty: Difficulty,
  duel: DuelInfo | null = null,
): FinishedMatch | null {
  if (!match.result) {
    return null
  }

  return {
    mode: match.mode,
    difficulty: match.trialId ? 'standard' : difficulty,
    result: match.result,
    stats: match.stats,
    lineup: match.human.roster.lineup(),
    opponentLineup: match.opponent.roster.lineup(),
    side: match.side,
    towersDestroyed: MODES[match.mode].towers.filter((slot) => match.structures[1][slot] <= 0).length,
    duel,
    trialId: match.trialId,
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

/** Turns a finished match into a history entry; the rating fields are filled in by `applyRecord`. */
export function matchRecordOf(finished: FinishedMatch, meta: { id: string; playedAt: string }): MatchRecord {
  const verdict = verdictOf(finished.result)
  const { stats } = finished
  const roundsWon = stats.teams[0].roundsWon

  const lineupOf = (lineup: Lineup) =>
    LANE_IDS.flatMap((lane) =>
      lineup[lane].map((hero) => ({
        heroId: hero.heroId,
        stars: hero.stars,
        lane,
        items: [...hero.items],
      })),
    )

  const heroLinesOf = (team: TeamId) =>
    stats.heroes
      .filter((h) => h.team === team)
      .sort((a, b) => b.damageDealt - a.damageDealt)
      .map((h) => ({
        heroId: h.heroId,
        stars: h.bestStars,
        ...(h.lane ? { lane: h.lane } : {}),
        kills: h.kills,
        deaths: h.deaths,
        damage: h.damageDealt,
        healing: h.healing,
        structureDamage: h.structureDamage,
        damageReceived: h.damageReceived,
        rounds: h.rounds,
        lastHits: h.lastHits,
      }))

  const synergiesOf = (lineup: Lineup) => [
    ...new Set(
      LANE_IDS.flatMap(
        (lane) =>
          resolveLane(
            lane,
            lineup[lane].map((h) => h.heroId),
            finished.mode,
          ).synergies,
      ),
    ),
  ]

  const heroes = heroLinesOf(0)

  return {
    ...meta,
    mode: finished.mode,
    difficulty: finished.difficulty,
    verdict,
    reason: finished.result.reason,
    rounds: stats.rounds,
    roundsWon,
    roundsLost: stats.teams[1].roundsWon,
    lineup: lineupOf(finished.lineup),
    synergies: synergiesOf(finished.lineup),
    heroes,
    opponentLineup: lineupOf(finished.opponentLineup),
    opponentSynergies: synergiesOf(finished.opponentLineup),
    opponentHeroes: heroLinesOf(1),
    history: stats.winners.map((winner) => verdictFor(0, winner)),
    roundLineups: stats.lineups,
    side: finished.side,
    balance: BALANCE_FINGERPRINT,
    replays: stats.replays,
    mvp: heroes[0]?.heroId ?? null,
    duel: finished.duel,
    heroKills: stats.teams[0].heroKills,
    towersDestroyed: finished.towersDestroyed,
    goldEarned: stats.teams[0].income.total,
    ratingBefore: 0,
    ratingAfter: 0,
    xp: matchXp(verdict, roundsWon),
    rewards: [],
    trialId: finished.trialId ?? null,
  }
}

const withoutRounds = (record: MatchRecord): MatchRecord =>
  record.roundLineups.length || record.replays.length
    ? {
        ...record,
        roundLineups: [],
        replays: [],
      }
    : record

/** Duels move the rating; before 7.4 matches against the computer did too. */
export const isRated = (record: Pick<MatchRecord, 'duel' | 'ratingBefore' | 'ratingAfter'>) =>
  record.duel?.ranked === true || record.ratingAfter !== record.ratingBefore

/** Records made before the detailed stats existed have no opponent side and no rounds; their zeros mean nothing. */
export const hasDetails = (record: MatchRecord) =>
  record.opponentHeroes.length > 0 || record.history.length > 0

const resultOf = (record: MatchRecord): MatchResult => ({
  winner: record.verdict === 'win' ? 0 : record.verdict === 'loss' ? 1 : null,
  reason: record.reason,
})

/**
 * Adds one match to the profile. It only needs the record, so matches played on another device
 * can be replayed on top of a newer profile; the rating fields are recomputed from the profile's rating.
 * A record already in the history is left out, so a duel settled on two devices counts once.
 */
export function applyRecord(profile: Profile, played: MatchRecord) {
  const known = profile.recent.find((r) => r.id === played.id)
  if (known) {
    return {
      record: known,
      profile,
      duplicate: true,
    }
  }

  const { verdict, mode } = played
  const won = verdict === 'win'
  const ratingBefore = profile.ratings[mode]

  /* The computer and friends only give XP; the rating is for beating strangers in ranked, one per mode. */
  const rating = played.duel?.ranked
    ? Math.max(
        0,
        ratingBefore +
          rankedRatingChange(resultOf(played), ratingBefore, played.duel.opponentRating, played.duel.ghost),
      )
    : ratingBefore

  const ratings = {
    ...profile.ratings,
    [mode]: rating,
  }

  const peakRatings = {
    ...profile.peakRatings,
    [mode]: Math.max(profile.peakRatings[mode], rating),
  }

  let record: MatchRecord = {
    ...played,
    ratingBefore,
    ratingAfter: rating,
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
    roundsPlayed: before.roundsPlayed + record.rounds,
    heroKills: before.heroKills + record.heroKills,
    streak,
    bestWinStreak: Math.max(before.bestWinStreak, streak),
    fastestWin: won ? Math.min(before.fastestWin ?? Infinity, record.rounds) : before.fastestWin,
  }

  const detailed = hasDetails(record)

  /* Two copies of a hero add up their numbers, but the match counts once for that hero. */
  let heroRecords = profile.heroes
  const counted = new Set<HeroId>()
  for (const line of record.heroes) {
    const first = !counted.has(line.heroId)
    counted.add(line.heroId)

    heroRecords = add(heroRecords, line.heroId, (h) => ({
      matches: (h?.matches ?? 0) + (first ? 1 : 0),
      wins: (h?.wins ?? 0) + (first && won ? 1 : 0),
      kills: (h?.kills ?? 0) + line.kills,
      deaths: (h?.deaths ?? 0) + line.deaths,
      damage: (h?.damage ?? 0) + line.damage,
      bestStars: Math.max(h?.bestStars ?? 1, line.stars) as StarLevel,
      detailed: (h?.detailed ?? 0) + (first && detailed ? 1 : 0),
      healing: (h?.healing ?? 0) + line.healing,
      structureDamage: (h?.structureDamage ?? 0) + line.structureDamage,
      damageReceived: (h?.damageReceived ?? 0) + line.damageReceived,
    }))
  }

  let synergyRecords = profile.synergies
  for (const id of record.synergies) {
    synergyRecords = add(synergyRecords, id, (s) => ({
      matches: (s?.matches ?? 0) + 1,
      wins: (s?.wins ?? 0) + (won ? 1 : 0),
    }))
  }

  const next: Profile = {
    ...profile,
    ratings,
    peakRatings,
    rating: bestRating(ratings),
    peakRating: bestRating(peakRatings),
    xp: profile.xp + record.xp,
    totals,
    heroes: heroRecords,
    synergies: synergyRecords,
    recent: [record, ...profile.recent]
      .slice(0, PROFILE.recentMatches)
      .map((kept, i) => (i < PROFILE.roundDetailMatches ? kept : withoutRounds(kept))),
  }

  const progress = advanceCareer(profile, next, record)
  record = {
    ...record,
    rewards: progress.rewards,
  }

  return {
    record,
    profile: {
      ...next,
      xp: progress.xp,
      career: progress.career,
      recent: [record, ...next.recent.slice(1)],
    },
    progress,
    duplicate: false,
  }
}

export const recordMatch = (
  profile: Profile,
  finished: FinishedMatch,
  meta: { id: string; playedAt: string },
) => applyRecord(profile, matchRecordOf(finished, meta))
