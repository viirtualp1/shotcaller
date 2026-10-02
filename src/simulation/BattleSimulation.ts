import { World } from 'miniplex'
import mitt from 'mitt'
import { TEAM_IDS, type HeroId, type ItemId, type LaneId, type StarLevel, type TeamId } from '@/content/ids'
import { MODES } from '@/content/modes'
import { BATTLE } from '@/content/rules'
import { SANDBOX, sandboxGoal, type SandboxGoal } from '@/content/sandbox'
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
  readonly lane: LaneId
  readonly items: readonly ItemId[]
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

    const safety = new TowerSafety(
      this.queries,
      index,
      this.map,
      Boolean(setup.sandbox && !setup.sandbox.creeps),
    )

    this.ctx = {
      setup,
      world: this.world,
      queries: this.queries,
      map: this.map,
      rng,
      events: this.events,
      clock: this.clock,
      index,
      safety,
      combat: new CombatService(this.world, this.events, index, structureScale, safety),
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

    /* The training ground sends creeps only when asked for, so dummies take every hit. */
    const creeps = !setup.sandbox || setup.sandbox.creeps

    this.systems = [
      ...(creeps ? [new WaveSpawnSystem(ctx)] : []),
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

  /** Endless on the training ground when the coach asks for no clock. */
  get duration() {
    return this.setup.sandbox?.endless ? Infinity : BATTLE.duration
  }

  get isOver() {
    return this.fallenThrone !== null || this.clock.elapsed >= this.duration
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

  /** Plays the battle out; an endless one has no end to reach, so it stops where it is. */
  runToEnd() {
    while (!this.isOver && Number.isFinite(this.duration)) {
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
        lane: h.hero.lane,
        items: [...h.hero.items],
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
        lane: h.hero.lane,
        items: h.hero.items,
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

  /** Live practice orders preserve health, mana, items and accumulated battle statistics. */
  setSandboxGoal(lane: LaneId, goal: SandboxGoal) {
    if (
      !this.setup.sandbox ||
      !this.map.lanes.includes(lane) ||
      (goal === 'dummies' && !this.setup.sandbox.dummies)
    ) {
      return false
    }

    for (const hero of this.queries.heroes) {
      if (hero.training?.lane === lane) {
        hero.training.goal = goal
        hero.targeting.target = null
        hero.targeting.chasing = true
      }
    }

    return true
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
        lineup.forEach((owned, slot) => {
          const hero = factory.hero(owned, team, lane, report, slot, stance)
          if (this.setup.sandbox) {
            hero.targeting.ignoresStructures = false
            hero.laneFollower!.stance = 'push'

            this.world.addComponent(hero, 'training', {
              lane,
              goal: sandboxGoal(this.setup.sandbox, lane),
            })

            this.world.removeComponent(hero, 'roamer')
          }
        })
      }
    }

    const dummies = Math.min(SANDBOX.maxDummies, this.setup.sandbox?.dummies ?? 0)
    for (const lane of this.map.lanes) {
      for (let i = 0; i < dummies; i++) {
        factory.dummy(1, lane, i, dummies)
      }
    }
  }
}

export const headlessResolver: BattleResolver = { resolve: (setup) => new BattleSimulation(setup).runToEnd() }
