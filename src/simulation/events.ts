import type { Emitter } from 'mitt'
import type { AbilityId, TeamId } from '@/content/ids'
import type { Vec2 } from '@/core/math/vec2'
import type { DamageType, Entity, HeroUnit, Unit } from './ecs/components'

export type SimulationEvents = {
  heroKilled: { victim: HeroUnit; killer: Entity; creditedHero: HeroUnit | null }
  creepKilled: { victim: Unit; killer: Entity }
  structureDamaged: { structure: Unit; amount: number; attackerTeam: TeamId }
  structureDestroyed: { structure: Unit; attackerTeam: TeamId }
  abilityCast: { caster: HeroUnit; ability: AbilityId }
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
}

export type SimulationEmitter = Emitter<SimulationEvents>
