import type { Ability } from './Ability'
import { densest } from './selectors'
import { paramsOf } from './params'

export const fireball: Ability = {
  id: 'fireball',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'fireball')
    const target = densest(ctx, caster, caster.attack.range + P.rangeBonus, P.radius)
    if (!target) {
      return false
    }

    ctx.factory.projectile(
      {
        source: caster,
        target,
        speed: P.speed,
        damage: P.damage * caster.caster.power,
        damageType: 'magical',
        splash: P.radius,
        visual: 'fireball',
      },
      0xff7a3d,
    )

    return true
  },
}
