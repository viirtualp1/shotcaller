import { World } from 'miniplex'
import mitt from 'mitt'
import { LANE_IDS, TEAM_IDS, type HeroId, type StarLevel, type TeamId } from '@/content/ids'
import { BATTLE } from '@/content/rules'
import { createRng } from '@/core/random/rng'
import type {
  BattleOutcome,
  BattleResolver,
  BattleSetup,
  PerTeam,
  StructureState,
} from '@/domain/battle/contracts'
import { emptyStructureState } from '@/domain/match/structures'
import { resolveLane } from '@/domain/synergy/resolveLane'
import { ABILITIES, type AbilityRegistry } from './abilities/registry'
import { BattleStatsRecorder } from './BattleStatsRecorder'
import type { Entity } from './ecs/components'
import { createQueries, type Queries } from './ecs/queries'
import type { SimulationEmitter, SimulationEvents } from './events'
import { DEFAULT_LANE_MAP, type LaneMap } from './map/LaneMap'
import { CombatService } from './services/CombatService'
import { EntityFactory } from './services/EntityFactory'
import { SpatialIndex } from './services/SpatialIndex'
import { TowerSafety } from './services/TowerSafety'
import type { SimulationClock, SimulationContext, System } from './SimulationContext'
import { AbilitySystem } from './systems/AbilitySystem'
import { AttackSystem } from './systems/AttackSystem'
import { CollisionSystem } from './systems/CollisionSystem'
import { DeathSystem } from './systems/DeathSystem'
import { HealAuraSystem } from './systems/HealAuraSystem'
import { MovementSystem } from './systems/MovementSystem'
import { ProjectileSystem } from './systems/ProjectileSystem'
import { RespawnSystem } from './systems/RespawnSystem'
import { RoamSystem } from './systems/RoamSystem'
import { SpinSystem } from './systems/SpinSystem'
import { StatusSystem } from './systems/StatusSystem'
import { TargetingSystem } from './systems/TargetingSystem'
import { WaveSpawnSystem } from './systems/WaveSpawnSystem'
import { DotSystem } from './systems/DotSystem'
import { ZoneSystem } from './systems/ZoneSystem'

export interface HeroStatus {
  readonly uid: string
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly team: TeamId
  readonly healthRatio: number
  readonly manaRatio: number
  readonly dead: boolean
  readonly respawnIn: number
  readonly damageDealt: number
  readonly kills: number
}

export interface BattleSimulationOptions {
  readonly map?: LaneMap
  readonly abilities?: AbilityRegistry
}

export class BattleSimulation {
  readonly world = new World<Entity>()
  readonly events: SimulationEmitter = mitt<SimulationEvents>()
  readonly queries: Queries
  readonly map: LaneMap
  private readonly ctx: SimulationContext
  private readonly systems: readonly System[]
  private readonly recorder: BattleStatsRecorder
  private readonly clock: SimulationClock = { elapsed: 0 }
  private fallenThrone: TeamId | null = null

  constructor(
    readonly setup: BattleSetup,
    options: BattleSimulationOptions = {},
  ) {
    this.map = options.map ?? DEFAULT_LANE_MAP
    this.queries = createQueries(this.world)
    const rng = createRng(setup.seed)
    const index = new SpatialIndex(this.queries.units)
    const structureScale = 1 + BATTLE.structureScalePerRound * (setup.round - 1)
    this.ctx = {
      setup,
      world: this.world,
      queries: this.queries,
      map: this.map,
      rng,
      events: this.events,
      clock: this.clock,
      index,
      safety: new TowerSafety(this.queries, index),
      combat: new CombatService(this.world, this.events, index, structureScale),
      factory: new EntityFactory(this.world, this.map, rng),
    }
    this.recorder = new BattleStatsRecorder(this.events)
    this.events.on('structureDestroyed', ({ structure }) => {
      if (structure.structure?.type === 'throne') this.fallenThrone = structure.team
    })
    this.spawnStartingUnits()

    const ctx = this.ctx
    this.systems = [
      new WaveSpawnSystem(ctx),
      new RespawnSystem(ctx),
      new StatusSystem(ctx),
      new HealAuraSystem(ctx),
      new SpinSystem(ctx),
      new ZoneSystem(ctx),
      new DotSystem(ctx),
      new AbilitySystem(ctx, options.abilities ?? ABILITIES),
      new RoamSystem(ctx),
      new TargetingSystem(ctx),
      new AttackSystem(ctx),
      new MovementSystem(ctx),
      new ProjectileSystem(ctx),
      new CollisionSystem(ctx),
      new DeathSystem(ctx),
    ]
  }

  get elapsed(): number {
    return this.clock.elapsed
  }

  get duration(): number {
    return BATTLE.duration
  }

  get isOver(): boolean {
    return this.fallenThrone !== null || this.clock.elapsed >= BATTLE.duration
  }

  step(dt: number = BATTLE.step): void {
    if (this.isOver) return
    this.clock.elapsed += dt
    this.ctx.safety.reset()
    this.ctx.index.sync()
    for (const system of this.systems) system.update(dt)
  }

  runToEnd(): BattleOutcome {
    while (!this.isOver) this.step()
    return this.outcome()
  }

  outcome(): BattleOutcome {
    return {
      structures: this.structureHealth(),
      stats: this.recorder.snapshot(),
      throneFell: this.fallenThrone,
      heroes: this.queries.heroes.entities.map((h) => ({
        uid: h.hero.uid,
        team: h.team,
        heroId: h.hero.heroId,
        stars: h.hero.stars,
        damageDealt: Math.round(h.hero.damageDealt),
        kills: h.hero.kills,
        deaths: h.hero.deaths,
      })),
    }
  }

  structureHealth(): PerTeam<StructureState> {
    const result: [StructureState, StructureState] = [emptyStructureState(), emptyStructureState()]
    for (const s of this.queries.structures) {
      result[s.team][s.structure.lane ?? 'throne'] = Math.max(0, Math.round(s.health.current))
    }
    return result
  }

  heroStatus(): ReadonlyMap<string, HeroStatus> {
    const status = new Map<string, HeroStatus>()
    for (const h of this.queries.heroes) {
      status.set(h.hero.uid, {
        uid: h.hero.uid,
        heroId: h.hero.heroId,
        stars: h.hero.stars,
        team: h.team,
        healthRatio: h.dead ? 0 : h.health.current / h.health.max,
        manaRatio: h.mana.current / h.mana.max,
        dead: Boolean(h.dead),
        respawnIn: Math.ceil(h.respawnTimer ?? 0),
        damageDealt: Math.round(h.hero.damageDealt),
        kills: h.hero.kills,
      })
    }
    return status
  }

  dispose(): void {
    this.events.all.clear()
    this.ctx.index.dispose()
    this.world.clear()
  }

  private spawnStartingUnits(): void {
    const { factory } = this.ctx
    for (const team of TEAM_IDS) {
      const structures = this.setup.structures[team]
      for (const lane of LANE_IDS)
        if (structures[lane] > 0) factory.structure(team, 'tower', lane, structures[lane])
      factory.structure(team, 'throne', null, structures.throne)
      for (const lane of LANE_IDS) {
        const lineup = this.setup.lineups[team][lane]
        const report = resolveLane(
          lane,
          lineup.map((h) => h.heroId),
        )
        lineup.forEach((owned, slot) => factory.hero(owned, team, lane, report, slot))
      }
    }
  }
}

export const headlessResolver: BattleResolver = {
  resolve: (setup) => new BattleSimulation(setup).runToEnd(),
}
