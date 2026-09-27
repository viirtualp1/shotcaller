import { ABILITY_PARAMS } from '@/content/abilities'
import { direction, offset } from '@/core/math/vec2'
import type { Ability } from './Ability'
import { enemiesAround, nearest } from './selectors'

const P = ABILITY_PARAMS.turret
const DEPLOY_DISTANCE = 22

export const turret: Ability = {
  id: 'turret',
  cast(caster, ctx) {
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
