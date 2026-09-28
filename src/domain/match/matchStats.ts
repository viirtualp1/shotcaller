import {
  LANE_IDS,
  TEAM_IDS,
  type HeroId,
  type ItemId,
  type LaneId,
  type StarLevel,
  type TeamId,
} from '@/content/ids'
import type { BattleOutcome, PerTeam, StructureState } from '../battle/contracts'
import type { IncomeBreakdown } from '../economy/income'
import type { Lineup } from '../roster/Roster'
import { emptyStructureState } from './structures'

/** A hero as it fought one round; a tuple, because a whole match of these is kept in the profile. */
export type RoundPick = readonly [heroId: HeroId, stars: StarLevel, lane: LaneId, items: readonly ItemId[]]

/** Both lineups of one round, the player's first. */
export type RoundLineups = PerTeam<readonly RoundPick[]>

export const picksOf = (lineup: Lineup): RoundPick[] =>
  LANE_IDS.flatMap((lane) =>
    lineup[lane].map((hero): RoundPick => [hero.heroId, hero.stars, lane, [...hero.items]]),
  )

export interface TeamMatchStats {
  readonly roundsWon: number
  readonly heroKills: number
  readonly creepKills: number
  /** Damage this team dealt to the enemy's buildings, by slot. */
  readonly structureDamage: StructureState
  readonly income: IncomeBreakdown
}

/** One row per hero type and team: copies and upgrades of the same hero are summed. */
export interface HeroMatchStats {
  readonly team: TeamId
  readonly heroId: HeroId
  readonly bestStars: StarLevel
  readonly rounds: number
  readonly damageDealt: number
  readonly damageReceived: number
  readonly structureDamage: number
  readonly healing: number
  readonly lastHits: number
  readonly kills: number
  readonly deaths: number
}

export interface MatchStats {
  readonly rounds: number
  readonly draws: number
  /** Who took each round so far, in order; null is a draw. */
  readonly winners: readonly (TeamId | null)[]
  readonly teams: PerTeam<TeamMatchStats>
  readonly heroes: readonly HeroMatchStats[]
  /** Who fought each round so far, in order. */
  readonly lineups: readonly RoundLineups[]
}

const emptyIncome = (): IncomeBreakdown => ({
  base: 0,
  interest: 0,
  farm: 0,
  win: 0,
  total: 0,
})

const emptyTeam = (): TeamMatchStats => ({
  roundsWon: 0,
  heroKills: 0,
  creepKills: 0,
  structureDamage: emptyStructureState(),
  income: emptyIncome(),
})

export const emptyMatchStats = (): MatchStats => ({
  rounds: 0,
  draws: 0,
  winners: [],
  teams: [emptyTeam(), emptyTeam()],
  heroes: [],
  lineups: [],
})

function sumRecords<K extends string>(a: Readonly<Record<K, number>>, b: Readonly<Record<K, number>>) {
  const keys = Object.keys(a) as K[]

  return Object.fromEntries(keys.map((key) => [key, a[key] + b[key]])) as Record<K, number>
}

export function addRound(
  stats: MatchStats,
  outcome: BattleOutcome,
  winner: TeamId | null,
  income: PerTeam<IncomeBreakdown>,
  lineups: RoundLineups,
): MatchStats {
  const teams = TEAM_IDS.map((team): TeamMatchStats => {
    const before = stats.teams[team]
    const round = outcome.stats[team]

    return {
      roundsWon: before.roundsWon + (winner === team ? 1 : 0),
      heroKills: before.heroKills + round.heroKills,
      creepKills: before.creepKills + round.creepKills,
      structureDamage: sumRecords(before.structureDamage, round.structureDamage),
      income: sumRecords(before.income, income[team]),
    }
  })

  const heroes = new Map(stats.heroes.map((h) => [`${h.team}:${h.heroId}`, h]))
  const fought = new Set<string>()

  for (const report of outcome.heroes) {
    const key = `${report.team}:${report.heroId}`
    const before = heroes.get(key)

    heroes.set(key, {
      team: report.team,
      heroId: report.heroId,
      bestStars: Math.max(before?.bestStars ?? 1, report.stars) as StarLevel,
      rounds: (before?.rounds ?? 0) + (fought.has(key) ? 0 : 1),
      damageDealt: (before?.damageDealt ?? 0) + report.damageDealt,
      damageReceived: (before?.damageReceived ?? 0) + report.damageReceived,
      structureDamage: (before?.structureDamage ?? 0) + report.structureDamage,
      healing: (before?.healing ?? 0) + report.healing,
      lastHits: (before?.lastHits ?? 0) + report.lastHits,
      kills: (before?.kills ?? 0) + report.kills,
      deaths: (before?.deaths ?? 0) + report.deaths,
    })

    fought.add(key)
  }

  return {
    rounds: stats.rounds + 1,
    draws: stats.draws + (winner === null ? 1 : 0),
    winners: [...stats.winners, winner],
    teams: teams as [TeamMatchStats, TeamMatchStats],
    heroes: [...heroes.values()],
    lineups: [...stats.lineups, lineups],
  }
}
