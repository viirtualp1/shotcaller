import { direction, offset } from '@/core/math/vec2'
import type { Ability } from './Ability'
import { enemiesAround, nearest, stun } from './selectors'
import { paramsOf } from './params'

const PLANT_DISTANCE = 20

/** Plants a banner between the Herald and the fight; its lane's order decides what the banner does. */
export const standard: Ability = {
  id: 'standard',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'standard')

    const target = nearest(
      caster.position,
      enemiesAround(ctx, caster, caster.position, P.triggerRadius, { includeStructures: true }),
    )

    if (!target) {
      return false
    }

    const at = offset(caster.position, direction(caster.position, target.position), PLANT_DISTANCE)
    const banner = ctx.factory.banner(caster, at)
    const stance = banner.banner?.stance ?? null

    if (stance === 'group') {
      for (const enemy of enemiesAround(ctx, caster, at, P.stunRadius)) {
        stun(enemy, P.stun, caster)
      }
    }

    ctx.events.emit('bannerPlanted', {
      banner,
      stance,
    })

    return true
  },
}
