import type { Ability } from './Ability'
import { enemiesAround, weakest } from './selectors'
import { paramsOf } from './params'

export const assassinate: Ability = {
  id: 'assassinate',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'assassinate')
    const target = weakest(enemiesAround(ctx, caster, caster.position, P.radius, { heroesOnly: true }))
    if (!target) {
      return false
    }

    ctx.factory.projectile(
      {
        source: caster,
        target,
        speed: P.speed,
        damage: P.damage * caster.caster.power,
        damageType: 'physical',
        splash: 0,
        visual: 'bullet',
      },
      caster.color,
    )

    return true
  },
}
