import { err, ok, type Result } from 'neverthrow'
import { opponentOf, TEAM_IDS, type LaneId, type StructureSlot, type TeamId } from '@/content/ids'
import type { IdGenerator } from '@/core/ids'
import type { Rng, RngState } from '@/core/random/rng'
import type {
  BattleOutcome,
  BattleSetup,
  HeroBattleReport,
  PerTeam,
  StructureState,
} from '../battle/contracts'
import { fromSide, mirrorOutcome } from '../battle/mirror'
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

/** What both devices of an online match agree on before it starts. */
export interface RemoteLink {
  /** Battle seeds come from it, so both devices replay the same fights. */
  readonly seed: string
  /** The team this device fights as: the host is team 0, the guest team 1. */
  readonly side: TeamId
}

/** Who plays the other side: a coach on this device, or a player elsewhere whose board arrives before each battle. */
export type Rival =
  | { readonly kind: 'coach'; readonly coach: CoachStrategy }
  | { readonly kind: 'remote'; readonly link: RemoteLink }

export interface MatchDependencies {
  readonly rng: Rng
  readonly ids: IdGenerator
  readonly rival: Rival
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
  readonly link?: RemoteLink
  readonly opponentReady?: boolean
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
  private opponentReady = false

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

    for (const player of this.managed) {
      player.shop.restock(player.level)
    }

    this.planOpponent()
  }

  /** Everything is seen from this device's player; this is the team that player fights as. */
  get side() {
    return this.link?.side ?? 0
  }

  get link() {
    return this.deps.rival.kind === 'remote' ? this.deps.rival.link : null
  }

  /** Online, the battle waits until the other player sends their board. */
  get awaitingOpponent() {
    return this.link !== null && !this.opponentReady
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

    if (this.awaitingOpponent) {
      return err({ code: 'opponentNotReady' })
    }

    this.currentPhase = 'battle'

    this.battle = {
      round: this.currentRound,
      seed: this.link ? `${this.link.seed}:${this.currentRound}` : this.deps.rng.next().toString(36).slice(2),
      lineups: fromSide(this.side, [this.human.roster.lineup(), this.opponent.roster.lineup()]),
      structures: fromSide(this.side, copyStructures(this.structureState)),
    }

    return ok(this.battle)
  }

  /** The other player's board for this round, sent once they are ready to fight. */
  receiveOpponent(state: PlayerState): Result<void, DomainError> {
    if (!this.link || this.currentPhase !== 'planning') {
      return err({ code: 'wrongPhase' })
    }

    this.opponent.restore(state)
    this.opponentReady = true

    return ok(undefined)
  }

  /** Takes the outcome in battle order, as the simulation reports it. */
  finishBattle(battleOutcome: BattleOutcome): Result<RoundSummary, DomainError> {
    if (this.currentPhase !== 'battle') {
      return err({ code: 'wrongPhase' })
    }

    const outcome = this.side === 0 ? battleOutcome : mirrorOutcome(battleOutcome)
    const winner = judgeRound(outcome)

    const income = TEAM_IDS.map((team) =>
      computeIncome(this.players[team].wallet.gold, outcome.stats[team], winner === team),
    ) as [IncomeBreakdown, IncomeBreakdown]

    TEAM_IDS.forEach((team) => this.players[team].recordRound(verdictFor(team, winner), income[team].total))

    this.battle = null
    this.opponentReady = false
    this.structureState = copyStructures(outcome.structures)
    this.summary = this.summarize(outcome, winner, income)
    this.matchStats = addRound(this.matchStats, outcome, winner, income)
    this.matchResult = judgeMatch(this.structureState, this.currentRound)
    this.currentPhase = this.matchResult ? 'finished' : 'summary'

    return ok(this.summary)
  }

  /** Ends the match for a side that gave up or went silent; a battle under way does not count. */
  forfeit(loser: TeamId): Result<MatchResult, DomainError> {
    if (this.currentPhase === 'finished') {
      return err({ code: 'wrongPhase' })
    }

    this.battle = null
    this.opponentReady = false

    this.matchResult = {
      winner: opponentOf(loser),
      reason: 'forfeit',
    }

    this.currentPhase = 'finished'

    return ok(this.matchResult)
  }

  nextRound(): Result<void, DomainError> {
    if (this.currentPhase !== 'summary') {
      return err({ code: 'wrongPhase' })
    }

    this.currentRound++

    for (const player of this.managed) {
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
      ...(this.link
        ? {
            link: this.link,
            opponentReady: this.opponentReady,
          }
        : {}),
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
    this.opponentReady = state.opponentReady ?? false
  }

  /** Players whose shop and progression run on this device; a remote player's run on theirs. */
  private get managed() {
    return this.deps.rival.kind === 'coach' ? this.players : [this.human]
  }

  private planOpponent() {
    if (this.deps.rival.kind !== 'coach') {
      return
    }

    this.deps.rival.coach.playTurn(this.opponent, {
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
