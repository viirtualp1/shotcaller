import { World } from 'miniplex'
import mitt from 'mitt'
import { TEAM_IDS, type HeroId, type StarLevel, type TeamId } from '@/content/ids'
import { MODES } from '@/content/modes'
import { BATTLE } from '@/content/rules'
import { createRng } from '@/core/random/rng'
import type { BattleOutcome, BattleResolver, BattleSetup, StructureState } from '@/domain/battle/contracts'
import { emptyStructureState } from '@/domain/match/structures'
import { resolveLane } from '@/domain/synergy/resolveLane'
import { ABILITIES, type AbilityRegistry } from './abilities/registry'
import { BattleStatsRecorder } from './BattleStatsRecorder'
import type { Entity } from './ecs/components'
import { createQueries, type Queries } from './ecs/queries'
import type { SimulationEmitter, SimulationEvents } from './events'
import { laneMapFor, type LaneMap } from './map/LaneMap'
import { CombatService } from './services/CombatService'
import { EntityFactory } from './services/EntityFactory'
import { SpatialIndex } from './services/SpatialIndex'
import { TowerSafety } from './services/TowerSafety'
import type { SimulationClock, SimulationContext, System } from './SimulationContext'
import { AbilitySystem } from './systems/AbilitySystem'
import { AttackSystem } from './systems/AttackSystem'
import { CollisionSystem } from './systems/CollisionSystem'
import { DeathSystem } from './systems/DeathSystem'
import { DefenseSystem } from './systems/DefenseSystem'
import { HealAuraSystem } from './systems/HealAuraSystem'
import { MovementSystem } from './systems/MovementSystem'
import { ProjectileSystem } from './systems/ProjectileSystem'
import { RelicSystem } from './systems/RelicSystem'
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
  readonly damageReceived: number
  readonly healing: number
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
  private readonly relicSystem: RelicSystem
  private readonly clock: SimulationClock = { elapsed: 0 }
  private fallenThrone: TeamId | null = null

  constructor(
    readonly setup: BattleSetup,
    options: BattleSimulationOptions = {},
  ) {
    this.map = options.map ?? laneMapFor(setup.mode)
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
      if (structure.structure?.type === 'throne') {
        this.fallenThrone = structure.team
      }
    })

    this.spawnStartingUnits()

    const ctx = this.ctx
    this.relicSystem = new RelicSystem(ctx)

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
      new DefenseSystem(ctx),
      new TargetingSystem(ctx),
      new AttackSystem(ctx),
      new MovementSystem(ctx),
      this.relicSystem,
      new ProjectileSystem(ctx),
      new CollisionSystem(ctx),
      new DeathSystem(ctx),
    ]
  }

  get elapsed() {
    return this.clock.elapsed
  }

  /** Heal relics of the one-lane map; empty elsewhere. */
  get relics() {
    return this.relicSystem.relics
  }

  get duration() {
    return BATTLE.duration
  }

  get isOver() {
    return this.fallenThrone !== null || this.clock.elapsed >= BATTLE.duration
  }

  step(dt: number = BATTLE.step) {
    if (this.isOver) {
      return
    }

    this.clock.elapsed += dt
    this.ctx.safety.reset()
    this.ctx.index.sync()

    for (const system of this.systems) {
      system.update(dt)
    }
  }

  runToEnd() {
    while (!this.isOver) {
      this.step()
    }

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
        damageReceived: Math.round(h.hero.damageReceived),
        structureDamage: Math.round(h.hero.structureDamage),
        healing: Math.round(h.hero.healing),
        lastHits: h.hero.lastHits,
        kills: h.hero.kills,
        deaths: h.hero.deaths,
      })),
    }
  }

  structureHealth() {
    const result: [StructureState, StructureState] = [emptyStructureState(), emptyStructureState()]
    for (const s of this.queries.structures) {
      result[s.team][s.structure.slot] = Math.max(0, Math.round(s.health.current))
    }

    return result
  }

  heroStatus() {
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
        damageReceived: Math.round(h.hero.damageReceived),
        healing: Math.round(h.hero.healing),
        kills: h.hero.kills,
      })
    }

    return status
  }

  dispose() {
    this.events.all.clear()
    this.ctx.index.dispose()
    this.world.clear()
  }

  private spawnStartingUnits() {
    const { factory } = this.ctx
    for (const team of TEAM_IDS) {
      const structures = this.setup.structures[team]
      for (const slot of MODES[this.setup.mode].towers) {
        if (structures[slot] > 0) {
          factory.tower(team, slot, structures[slot])
        }
      }

      factory.throne(team, structures.throne)

      for (const lane of this.map.lanes) {
        const lineup = this.setup.lineups[team][lane]

        const report = resolveLane(
          lane,
          lineup.map((h) => h.heroId),
          this.setup.mode,
        )

        const stance = this.setup.stances?.[team][lane]
        lineup.forEach((owned, slot) => factory.hero(owned, team, lane, report, slot, stance))
      }
    }
  }
}

export const headlessResolver: BattleResolver = { resolve: (setup) => new BattleSimulation(setup).runToEnd() }
