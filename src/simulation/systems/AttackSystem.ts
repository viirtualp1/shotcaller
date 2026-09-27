import { ROLES } from '@/content/roles'
import { BATTLE } from '@/content/rules'
import { distance } from '@/core/math/vec2'
import { isAlive, isDisabled, type Unit } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

function farmMultiplier(unit: Unit) {
  if (!unit.hero) {
    return 1
  }

  const farm = ROLES[unit.hero.role].farm
  return farm ? 1 + Math.min(farm.max, unit.hero.farmStacks * farm.perLastHit) : 1
}

export const attackReach = (unit: Unit) => (unit.attack?.ranged ? unit.attack.range : BATTLE.meleeReach)

export const inReach = (unit: Unit, target: Unit) =>
  distance(unit.position, target.position) - unit.radius - target.radius <= attackReach(unit)

export class AttackSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update() {
    for (const unit of this.ctx.queries.fighters) {
      const target = unit.targeting.target
      if (!target || !isAlive(unit) || !isAlive(target) || isDisabled(unit)) {
        continue
      }

      if (unit.attack.cooldown > 0 || !inReach(unit, target)) {
        continue
      }

      this.strike(unit, target)
    }
  }

  private strike(unit: Unit, target: Unit) {
    const { attack } = unit
    if (!attack) {
      return
    }

    attack.cooldown = attack.interval

    this.ctx.events.emit('attacked', {
      attacker: unit,
      target,
    })

    const damage = attack.damage * farmMultiplier(unit)
    if (unit.mana && unit.hero) {
      unit.mana.current = Math.min(unit.mana.max, unit.mana.current + BATTLE.manaPerAttack * unit.mana.gain)
    }

    if (attack.ranged) {
      const fromStructure = unit.kind === 'structure'
      this.ctx.factory.projectile(
        {
          source: unit,
          target,
          speed: fromStructure ? BATTLE.projectileSpeed.structure : BATTLE.projectileSpeed.unit,
          damage,
          damageType: 'physical',
          splash: 0,
          visual: fromStructure ? 'shell' : 'bolt',
        },
        unit.color,
      )

      return
    }

    this.ctx.combat.dealDamage(unit, target, damage, 'physical')
  }
}
