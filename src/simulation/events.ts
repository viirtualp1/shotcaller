import type { Emitter } from 'mitt'
import type { AbilityId, LaneStance, TeamId } from '@/content/ids'
import type { Vec2 } from '@/core/math/vec2'
import type { DamageType, Entity, HeroUnit, Unit } from './ecs/components'

export type SimulationEvents = {
  heroKilled: { victim: HeroUnit; killer: Entity; creditedHero: HeroUnit | null }
  creepKilled: { victim: Unit; killer: Entity }
  structureDamaged: { structure: Unit; amount: number; attackerTeam: TeamId }
  structureDestroyed: { structure: Unit; attackerTeam: TeamId }
  /** `echo` marks the repeat of an Echo Shard. */
  abilityCast: { caster: HeroUnit; ability: AbilityId; echo?: boolean }
  attacked: { attacker: Unit; target: Unit }
  damaged: { target: Unit; source: Unit; amount: number; type: DamageType; crit: boolean }
  evaded: { target: Unit; source: Unit }
  bashed: { target: Unit; source: Unit; stun: number }
  died: { unit: Unit }
  revived: { hero: HeroUnit; byItem: boolean }
  dash: { from: Vec2; to: Vec2; color: number }
  hook: { from: Vec2; to: Vec2; color: number }
  chain: { points: readonly Vec2[]; color: number }
  burst: { at: Vec2; radius: number; color: number }
  healed: { target: Unit; amount: number }
  shielded: { target: Unit; amount: number }
  /** Under Hold a repair also takes back the enemy's building damage of the round, as far as there is any. */
  repaired: { structure: Unit; healer: HeroUnit; amount: number; reclaims: boolean }
  teleported: { hero: HeroUnit; from: Vec2; to: Vec2 }
  cursed: { hero: HeroUnit; throne: Unit; amount: number }
  bannerPlanted: { banner: Unit; stance: LaneStance | null }
}

export type SimulationEmitter = Emitter<SimulationEvents>
