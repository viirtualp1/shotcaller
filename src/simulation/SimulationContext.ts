import type { World } from 'miniplex'
import type { Rng } from '@/core/random/rng'
import type { BattleSetup } from '@/domain/battle/contracts'
import type { Entity } from './ecs/components'
import type { Queries } from './ecs/queries'
import type { SimulationEmitter } from './events'
import type { LaneMap } from './map/LaneMap'
import type { CombatService } from './services/CombatService'
import type { EntityFactory } from './services/EntityFactory'
import type { SpatialIndex } from './services/SpatialIndex'
import type { TowerSafety } from './services/TowerSafety'

export interface SimulationClock {
  elapsed: number
}

export interface SimulationContext {
  readonly setup: BattleSetup
  readonly world: World<Entity>
  readonly queries: Queries
  readonly map: LaneMap
  readonly rng: Rng
  readonly events: SimulationEmitter
  readonly clock: SimulationClock
  readonly index: SpatialIndex
  readonly safety: TowerSafety
  readonly combat: CombatService
  readonly factory: EntityFactory
}

export interface System {
  update(dt: number): void
}
