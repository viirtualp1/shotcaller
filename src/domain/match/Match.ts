import { err, ok, type Result } from 'neverthrow'
import { TEAM_IDS, type LaneId, type StructureSlot, type TeamId } from '@/content/ids'
import type { IdGenerator } from '@/core/ids'
import type { Rng, RngState } from '@/core/random/rng'
import type {
  BattleOutcome,
  BattleSetup,
  HeroBattleReport,
  PerTeam,
  StructureState,
} from '../battle/contracts'
import type { CoachStrategy } from '../coach/CoachStrategy'
import { HeroPool, type PoolState } from '../economy/HeroPool'
import { computeIncome, type IncomeBreakdown } from '../economy/income'
import type { DomainError } from '../errors'
import { Player, type PlayerState } from '../player/Player'
import { judgeMatch, judgeRound, totalStructureDamage, verdictFor, type MatchResult } from './judge'
import { addRound, emptyMatchStats, type MatchStats } from './matchStats'
import { freshStructures } from './structures'

export type MatchPhase = 'planning' | 'battle' | 'summary' | 'finished'

export interface RoundSummary {
  readonly round: number
  readonly winner: TeamId | null
  readonly structureDamage: PerTeam<number>
  readonly laneDamage: Readonly<Record<LaneId | 'throne', PerTeam<number>>>
  readonly heroKills: PerTeam<number>
  readonly income: PerTeam<IncomeBreakdown>
  readonly mvp: HeroBattleReport | null
  /** Every hero of both teams, highest damage first. */
  readonly heroes: readonly HeroBattleReport[]
}

export interface MatchDependencies {
  readonly rng: Rng
  readonly ids: IdGenerator
  readonly opponentCoach: CoachStrategy
}

/** Everything needed to rebuild a match exactly, including the random stream and an unfinished battle. */
export interface MatchState {
  readonly round: number
  readonly phase: MatchPhase
  readonly rng: RngState
  readonly pool: PoolState
  readonly structures: PerTeam<StructureState>
  readonly players: PerTeam<PlayerState>
  readonly summary: RoundSummary | null
  readonly result: MatchResult | null
  readonly battle: BattleSetup | null
  readonly stats: MatchStats
}

const copyStructures = (s: PerTeam<StructureState>): [StructureState, StructureState] => [
  { ...s[0] },
  { ...s[1] },
]

export class Match {
  readonly players: PerTeam<Player>
  private readonly pool = new HeroPool()
  private currentRound = 1
  private currentPhase: MatchPhase = 'planning'
  private structureState: [StructureState, StructureState] = [freshStructures(), freshStructures()]
  private summary: RoundSummary | null = null
  private matchResult: MatchResult | null = null
  private battle: BattleSetup | null = null
  private matchStats: MatchStats = emptyMatchStats()

  constructor(
    private readonly deps: MatchDependencies,
    state?: MatchState,
  ) {
    const playerDeps = {
      pool: this.pool,
      rng: deps.rng,
      ids: deps.ids,
    }

    this.players = [new Player(0, playerDeps), new Player(1, playerDeps)]

    if (state) {
      this.restore(state)

      return
    }

    for (const player of this.players) {
      player.shop.restock(player.level)
    }

    this.planOpponent()
  }

  get human() {
    return this.players[0]
  }

  get opponent() {
    return this.players[1]
  }

  get round() {
    return this.currentRound
  }

  get phase() {
    return this.currentPhase
  }

  get structures() {
    return this.structureState
  }

  get lastSummary() {
    return this.summary
  }

  get result() {
    return this.matchResult
  }

  get pendingBattle() {
    return this.battle
  }

  get stats() {
    return this.matchStats
  }

  /** `allowEmptyBoard` is for a planning timer running out: the round starts even with nobody placed. */
  startBattle({ allowEmptyBoard = false } = {}): Result<BattleSetup, DomainError> {
    if (this.currentPhase !== 'planning') {
      return err({ code: 'wrongPhase' })
    }

    if (this.human.roster.boardCount === 0 && !allowEmptyBoard) {
      return err({ code: 'emptyBoard' })
    }

    this.currentPhase = 'battle'

    this.battle = {
      round: this.currentRound,
      seed: this.deps.rng.next().toString(36).slice(2),
      lineups: [this.human.roster.lineup(), this.opponent.roster.lineup()],
      structures: copyStructures(this.structureState),
    }

    return ok(this.battle)
  }

  finishBattle(outcome: BattleOutcome): Result<RoundSummary, DomainError> {
    if (this.currentPhase !== 'battle') {
      return err({ code: 'wrongPhase' })
    }

    const winner = judgeRound(outcome)

    const income = TEAM_IDS.map((team) =>
      computeIncome(this.players[team].wallet.gold, outcome.stats[team], winner === team),
    ) as [IncomeBreakdown, IncomeBreakdown]

    TEAM_IDS.forEach((team) => this.players[team].recordRound(verdictFor(team, winner), income[team].total))

    this.battle = null
    this.structureState = copyStructures(outcome.structures)
    this.summary = this.summarize(outcome, winner, income)
    this.matchStats = addRound(this.matchStats, outcome, winner, income)
    this.matchResult = judgeMatch(this.structureState, this.currentRound)
    this.currentPhase = this.matchResult ? 'finished' : 'summary'

    return ok(this.summary)
  }

  nextRound(): Result<void, DomainError> {
    if (this.currentPhase !== 'summary') {
      return err({ code: 'wrongPhase' })
    }

    this.currentRound++

    for (const player of this.players) {
      player.prepareRound()
    }

    this.planOpponent()
    this.currentPhase = 'planning'

    return ok(undefined)
  }

  snapshot(): MatchState {
    return {
      round: this.currentRound,
      phase: this.currentPhase,
      rng: this.deps.rng.state(),
      pool: this.pool.snapshot(),
      structures: copyStructures(this.structureState),
      players: [this.human.snapshot(), this.opponent.snapshot()],
      summary: this.summary,
      result: this.matchResult,
      battle: this.battle,
      stats: this.matchStats,
    }
  }

  private restore(state: MatchState) {
    this.currentRound = state.round
    this.currentPhase = state.phase
    this.pool.restore(state.pool)
    this.structureState = copyStructures(state.structures)
    TEAM_IDS.forEach((team) => this.players[team].restore(state.players[team]))
    this.summary = state.summary
    this.matchResult = state.result
    this.battle = state.battle
    this.matchStats = state.stats
  }

  private planOpponent() {
    this.deps.opponentCoach.playTurn(this.opponent, {
      round: this.currentRound,
      rng: this.deps.rng,
    })
  }

  private summarize(
    outcome: BattleOutcome,
    winner: TeamId | null,
    income: PerTeam<IncomeBreakdown>,
  ): RoundSummary {
    const [ours, theirs] = outcome.stats

    const damageAt = (slot: StructureSlot): PerTeam<number> => [
      ours.structureDamage[slot],
      theirs.structureDamage[slot],
    ]

    const mvp =
      outcome.heroes.filter((h) => h.team === 0).sort((a, b) => b.damageDealt - a.damageDealt)[0] ?? null

    return {
      round: this.currentRound,
      winner,
      structureDamage: [totalStructureDamage(ours), totalStructureDamage(theirs)],
      laneDamage: {
        top: damageAt('top'),
        mid: damageAt('mid'),
        bot: damageAt('bot'),
        throne: damageAt('throne'),
      },
      heroKills: [ours.heroKills, theirs.heroKills],
      income,
      mvp,
      heroes: [...outcome.heroes].sort((a, b) => b.damageDealt - a.damageDealt),
    }
  }
}
