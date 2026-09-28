import {
  LANE_IDS,
  type HeroId,
  type ItemId,
  type LaneId,
  type StarLevel,
  type SynergyId,
  type TeamId,
} from '@/content/ids'
import { PROFILE } from '@/content/profile'
import type { Difficulty } from '@/content/rules'
import { verdictFor, type MatchResult } from '../match/judge'
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

export interface MatchHeroLine {
  readonly heroId: HeroId
  readonly stars: StarLevel
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

/** A match against a friend rather than the computer; only these move the rating. */
export interface DuelInfo {
  readonly opponentName: string
}

/** What the profile needs from a match once it is over. */
export interface FinishedMatch {
  readonly difficulty: Difficulty
  readonly result: MatchResult
  readonly stats: MatchStats
  readonly lineup: Lineup
  readonly opponentLineup: Lineup
  readonly towersDestroyed: number
  readonly duel: DuelInfo | null
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

export function finishedMatch(
  match: Match,
  difficulty: Difficulty,
  duel: DuelInfo | null = null,
): FinishedMatch | null {
  if (!match.result) {
    return null
  }

  return {
    difficulty,
    result: match.result,
    stats: match.stats,
    lineup: match.human.roster.lineup(),
    opponentLineup: match.opponent.roster.lineup(),
    towersDestroyed: LANE_IDS.filter((lane) => match.structures[1][lane] <= 0).length,
    duel,
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
          ).synergies,
      ),
    ),
  ]

  const heroes = heroLinesOf(0)

  return {
    ...meta,
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
    mvp: heroes[0]?.heroId ?? null,
    duel: finished.duel,
    heroKills: stats.teams[0].heroKills,
    towersDestroyed: finished.towersDestroyed,
    goldEarned: stats.teams[0].income.total,
    ratingBefore: 0,
    ratingAfter: 0,
    xp: matchXp(verdict, roundsWon),
  }
}

/** Duels move the rating; before 7.4 matches against the computer did too. */
export const isRated = (record: Pick<MatchRecord, 'duel' | 'ratingBefore' | 'ratingAfter'>) =>
  record.duel !== null || record.ratingAfter !== record.ratingBefore

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

  const { verdict } = played
  const won = verdict === 'win'
  /* The computer only gives XP; the rating is for beating people. */
  const rating = played.duel ? Math.max(0, profile.rating + ratingChange(resultOf(played))) : profile.rating

  const record: MatchRecord = {
    ...played,
    ratingBefore: profile.rating,
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

  let heroRecords = profile.heroes
  for (const line of record.heroes) {
    heroRecords = add(heroRecords, line.heroId, (h) => ({
      matches: (h?.matches ?? 0) + 1,
      wins: (h?.wins ?? 0) + (won ? 1 : 0),
      kills: (h?.kills ?? 0) + line.kills,
      deaths: (h?.deaths ?? 0) + line.deaths,
      damage: (h?.damage ?? 0) + line.damage,
      bestStars: Math.max(h?.bestStars ?? 1, line.stars) as StarLevel,
      detailed: (h?.detailed ?? 0) + (detailed ? 1 : 0),
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

  return {
    record,
    profile: {
      ...profile,
      rating,
      peakRating: Math.max(profile.peakRating, rating),
      xp: profile.xp + record.xp,
      totals,
      heroes: heroRecords,
      synergies: synergyRecords,
      recent: [record, ...profile.recent].slice(0, PROFILE.recentMatches),
    } satisfies Profile,
    duplicate: false,
  }
}

export const recordMatch = (
  profile: Profile,
  finished: FinishedMatch,
  meta: { id: string; playedAt: string },
) => applyRecord(profile, matchRecordOf(finished, meta))
