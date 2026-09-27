import type { Circle } from 'check2d'
import type { With } from 'miniplex'
import type { AbilityId, HeroId, ItemId, LaneId, RoleId, StarLevel, TeamId } from '@/content/ids'
import type { CreepVariant, StructureType } from '@/content/units'
import type { Vec2 } from '@/core/math/vec2'
import type { LanePath } from '../map/LaneMap'

export type UnitKind = 'hero' | 'creep' | 'structure' | 'turret'
export type DamageType = 'physical' | 'magical'
export type ProjectileVisual = 'bolt' | 'arrow' | 'shell' | 'fireball' | 'dagger' | 'bullet'

export interface Health {
  current: number
  max: number
}

export interface Attack {
  damage: number
  interval: number
  cooldown: number
  range: number
  ranged: boolean
}

export interface Targeting {
  aggroRange: number
  target: Unit | null
  chasing: boolean
  prefersStructures: boolean
}

export interface LaneFollower {
  path: LanePath
  waypoint: number
  avoidsTowers: boolean
}

export interface Status {
  stun: number
  root: number
  slow: number
  slowFactor: number
}

export interface Mana {
  current: number
  max: number
  gain: number
}

export interface Caster {
  ability: AbilityId
  power: number
}

export interface HeroData {
  uid: string
  heroId: HeroId
  stars: StarLevel
  role: RoleId
  lane: LaneId
  items: readonly ItemId[]
  farmStacks: number
  kills: number
  deaths: number
  damageDealt: number
  damageReceived: number
  structureDamage: number
  healing: number
  lastHits: number
}

export interface Roamer {
  thinkTimer: number
  quarry: Unit | null
}

export interface HealAura {
  radius: number
  hpPercentPerSecond: number
  timer: number
}

export interface Spin {
  remaining: number
  tickTimer: number
  tick: number
  damage: number
  radius: number
}

export interface Projectile {
  source: Unit
  target: Unit
  speed: number
  damage: number
  damageType: DamageType
  splash: number
  visual: ProjectileVisual
  poison?: PoisonPayload
}

export interface PoisonPayload {
  damage: number
  tick: number
  duration: number
  slow: number
}

export interface Zone {
  source: Unit
  radius: number
  remaining: number
  tick: number
  tickTimer: number
  damage: number
  slow: number
}

export interface StructureData {
  type: StructureType
  lane: LaneId | null
}

export interface CreepData {
  variant: CreepVariant
  mega: boolean
  summoned?: boolean
}

export interface Shield {
  amount: number
  remaining: number
}

export interface DamageOverTime {
  source: Unit
  damage: number
  tick: number
  tickTimer: number
  remaining: number
}

/** Passive effects granted by items. */
export interface ItemEffectsState {
  lifesteal: number
  thorns: number
  revive: number
}

export interface Entity {
  team: TeamId
  position: Vec2
  kind?: UnitKind
  color?: number
  radius?: number
  health?: Health
  armor?: number
  structureDamage?: number
  speed?: number
  attack?: Attack
  targeting?: Targeting
  laneFollower?: LaneFollower
  status?: Status
  mana?: Mana
  caster?: Caster
  hero?: HeroData
  roamer?: Roamer
  healAura?: HealAura
  spin?: Spin
  structure?: StructureData
  creep?: CreepData
  owner?: Unit
  lifetime?: number
  projectile?: Projectile
  zone?: Zone
  shield?: Shield
  dot?: DamageOverTime
  itemEffects?: ItemEffectsState
  damageTaken?: number
  respawnTimer?: number
  body?: Circle
  dead?: true
}

export type Unit = With<Entity, 'kind' | 'health' | 'radius' | 'armor' | 'status'>
export type HeroUnit = With<Unit, 'hero' | 'mana' | 'caster' | 'attack' | 'targeting' | 'speed'>

export const isAlive = (e: Entity) => !e.dead && (e.health?.current ?? 1) > 0
export const isHero = (e: Entity): e is HeroUnit => e.kind === 'hero'
export const isStructure = (e: Entity) => e.kind === 'structure'
export const isDisabled = (e: Unit) => e.status.stun > 0
