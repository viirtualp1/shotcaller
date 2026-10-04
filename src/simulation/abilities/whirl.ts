import type { Ability } from './Ability'
import { enemiesAround } from './selectors'
import { paramsOf } from './params'

export const whirl: Ability = {
  id: 'whirl',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'whirl')
    if (caster.spin || !enemiesAround(ctx, caster, caster.position, P.triggerRadius).length) {
      return false
    }

    ctx.world.addComponent(caster, 'spin', {
      remaining: P.duration,
      tickTimer: 0,
      tick: P.tick,
      damage: P.damage * caster.caster.power,
      radius: P.radius,
    })

    return true
  },
}
