import type {
  HeroId,
  ItemId,
  LaneId,
  LaneStance,
  ModeId,
  StarLevel,
  StructureSlot,
  TeamId,
} from '@/content/ids'
import type { SandboxSettings } from '@/content/sandbox'
import type { Lineup } from '../roster/Roster'

export type StructureState = Record<StructureSlot, number>
export type PerTeam<T> = readonly [T, T]

/** The order each lane got; a lane missing here is left to its heroes' judgement. */
export type LaneStances = Readonly<Partial<Record<LaneId, LaneStance>>>

export interface BattleSetup {
  readonly mode: ModeId
  readonly round: number
  readonly seed: string
  readonly lineups: PerTeam<Lineup>
  readonly structures: PerTeam<StructureState>
  /** Missing for fights set up without orders, such as the start screen's. */
  readonly stances?: PerTeam<LaneStances>
  /** Set on the training ground: dummies stand on the other side's lanes, and creeps come only when asked for. */
  readonly sandbox?: SandboxSettings
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
  /** Lane and items are missing on round summaries saved before 8.5. */
  readonly lane?: LaneId
  readonly items?: readonly ItemId[]
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
