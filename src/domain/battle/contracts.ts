import type { HeroId, StarLevel, StructureSlot, TeamId } from '@/content/ids'
import type { Lineup } from '../roster/Roster'

export type StructureState = Record<StructureSlot, number>
export type PerTeam<T> = readonly [T, T]

export interface BattleSetup {
  readonly round: number
  readonly seed: string
  readonly lineups: PerTeam<Lineup>
  readonly structures: PerTeam<StructureState>
}

export interface TeamBattleStats {
  heroKills: number
  creepKills: number
  structureDamage: StructureState
}

export interface HeroBattleReport {
  readonly uid: string
  readonly team: TeamId
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly damageDealt: number
  readonly damageReceived: number
  readonly structureDamage: number
  readonly healing: number
  readonly lastHits: number
  readonly kills: number
  readonly deaths: number
}

export interface BattleOutcome {
  readonly structures: PerTeam<StructureState>
  readonly stats: PerTeam<TeamBattleStats>
  readonly throneFell: TeamId | null
  readonly heroes: readonly HeroBattleReport[]
}

/** Implemented by the simulation layer; the domain only depends on this contract. */
export interface BattleResolver {
  resolve(setup: BattleSetup): BattleOutcome
}
