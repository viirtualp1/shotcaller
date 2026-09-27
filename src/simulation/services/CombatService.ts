import type { World } from 'miniplex'
import type { Vec2 } from '@/core/math/vec2'
import { BATTLE } from '@/content/rules'
import { ROLES } from '@/content/roles'
import {
  isAlive,
  isHero,
  type DamageType,
  type Entity,
  type HeroUnit,
  type PoisonPayload,
  type Unit,
} from '../ecs/components'
import type { SimulationEmitter } from '../events'
import type { SpatialIndex } from './SpatialIndex'

export interface DamageOptions {
  readonly structureBonus?: number
  /** Reflected damage never reflects again. */
  readonly reflected?: boolean
}

export interface SplashOptions extends DamageOptions {
  readonly includeStructures?: boolean
}

export const creditedHero = (source: Entity): HeroUnit | null =>
  isHero(source) ? source : source.owner && isHero(source.owner) ? source.owner : null

/** Applies damage and healing; deaths are only flagged here and resolved by DeathSystem at the end of a step. */
export class CombatService {
  constructor(
    private readonly world: World<Entity>,
    private readonly events: SimulationEmitter,
    private readonly index: SpatialIndex,
    private readonly structureScale: number,
  ) {}

  dealDamage(
    source: Unit,
    target: Unit,
    amount: number,
    type: DamageType,
    options: DamageOptions = {},
  ): number {
    if (!isAlive(target)) return 0
    let value = amount * (target.damageTaken ?? 1)
    if (target.kind === 'structure') {
      value *= (source.structureDamage ?? 1) * this.structureScale * (options.structureBonus ?? 1)
    }
    if (type === 'physical') value *= 1 - target.armor
    value = this.absorb(target, value)
    value = Math.min(value, target.health.current)
    target.health.current -= value

    this.gainManaFromHit(target, value)
    const hero = creditedHero(source)
    if (hero) hero.hero.damageDealt += value
    this.events.emit('damaged', { target, source, amount: value, type })
    if (target.kind === 'structure') {
      this.events.emit('structureDamaged', { structure: target, amount: value, attackerTeam: source.team })
    }
    this.applyItemReactions(source, target, value, type, options)
    if (target.health.current <= 0 && !this.tryRevive(target)) this.onKilled(target, source)
    return value
  }

  heal(target: Unit, amount: number): number {
    if (!isAlive(target)) return 0
    const before = target.health.current
    target.health.current = Math.min(target.health.max, before + amount)
    const healed = target.health.current - before
    if (healed > 0) this.events.emit('healed', { target, amount: healed })
    return healed
  }

  grantShield(target: Unit, amount: number, duration: number): void {
    if (target.shield) {
      target.shield.amount = Math.max(amount, target.shield.amount)
      target.shield.remaining = duration
    } else {
      this.world.addComponent(target, 'shield', { amount, remaining: duration })
    }
    this.events.emit('shielded', { target, amount })
  }

  poison(source: Unit, target: Unit, payload: PoisonPayload): void {
    if (!isAlive(target)) return
    target.status.slow = Math.max(target.status.slow, payload.duration / 2)
    target.status.slowFactor = Math.max(target.status.slowFactor, payload.slow)
    const dot = {
      source,
      damage: payload.damage,
      tick: payload.tick,
      tickTimer: payload.tick,
      remaining: payload.duration,
    }
    if (target.dot) Object.assign(target.dot, dot)
    else this.world.addComponent(target, 'dot', dot)
  }

  splash(
    source: Unit,
    center: Vec2,
    radius: number,
    damage: number,
    type: DamageType,
    options: SplashOptions = {},
  ) {
    const victims = this.index.near(
      center,
      radius,
      (u) => u.team !== source.team && isAlive(u) && (options.includeStructures || u.kind !== 'structure'),
    )
    for (const victim of victims) this.dealDamage(source, victim, damage, type, options)
    return victims
  }

  private absorb(target: Unit, value: number): number {
    const shield = target.shield
    if (!shield || shield.amount <= 0) return value
    const absorbed = Math.min(shield.amount, value)
    shield.amount -= absorbed
    return value - absorbed
  }

  private gainManaFromHit(target: Unit, value: number): void {
    if (!target.mana || !target.hero) return
    const gained = (value / target.health.max) * BATTLE.manaPerDamageTaken * target.mana.gain
    target.mana.current = Math.min(target.mana.max, target.mana.current + gained)
  }

  private applyItemReactions(
    source: Unit,
    target: Unit,
    value: number,
    type: DamageType,
    options: DamageOptions,
  ): void {
    const lifesteal = source.itemEffects?.lifesteal ?? 0
    if (lifesteal > 0 && value > 0) this.heal(source, value * lifesteal)
    const thorns = target.itemEffects?.thorns ?? 0
    if (thorns > 0 && type === 'physical' && !options.reflected && source.kind !== 'structure') {
      this.dealDamage(target, source, value * thorns, 'magical', { reflected: true })
    }
  }

  private tryRevive(target: Unit): boolean {
    const revive = target.itemEffects?.revive ?? 0
    if (!isHero(target) || revive <= 0 || !target.itemEffects) return false
    target.itemEffects.revive = 0
    target.health.current = target.health.max * revive
    this.events.emit('revived', { hero: target, byItem: true })
    return true
  }

  private onKilled(target: Unit, killer: Unit): void {
    const hero = creditedHero(killer)
    const farm = hero ? ROLES[hero.hero.role].farm : undefined
    if (isHero(target)) {
      target.hero.deaths++
      if (hero) {
        hero.hero.kills++
        if (farm) hero.hero.farmStacks += farm.perHeroKill
      }
      this.events.emit('heroKilled', { victim: target, killer, creditedHero: hero })
    } else if (target.kind === 'creep') {
      if (hero && farm) hero.hero.farmStacks++
      this.events.emit('creepKilled', { victim: target, killer })
    } else if (target.kind === 'structure') {
      this.events.emit('structureDestroyed', { structure: target, attackerTeam: killer.team })
    }
  }
}
