import { direction, offset } from '@/core/math/vec2'
import type { Ability } from './Ability'
import { enemiesAround, nearest } from './selectors'
import { paramsOf } from './params'

const DEPLOY_DISTANCE = 22

export const turret: Ability = {
  id: 'turret',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'turret')

    const target = nearest(
      caster.position,
      enemiesAround(ctx, caster, caster.position, P.triggerRadius, { includeStructures: true }),
    )

    if (!target) {
      return false
    }

    ctx.factory.turret(
      caster,
      offset(caster.position, direction(caster.position, target.position), DEPLOY_DISTANCE),
    )

    return true
  },
}
