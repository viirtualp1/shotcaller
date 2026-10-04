import { distance } from '@/core/math/vec2'
import { isAlive } from '../ecs/components'
import type { Ability } from './Ability'
import { healthRatio } from './selectors'
import { paramsOf } from './params'

/** Starts repairing the most damaged allied tower or throne in reach; ChannelSystem does the rest. */
export const mend: Ability = {
  id: 'mend',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'mend')
    if (caster.channel) {
      return false
    }

    const [structure] = ctx.queries.structures.entities
      .filter(
        (s) =>
          s.team === caster.team &&
          isAlive(s) &&
          healthRatio(s) < P.threshold &&
          distance(caster.position, s.position) - s.radius <= P.radius,
      )
      .sort((a, b) => healthRatio(a) - healthRatio(b))

    if (!structure) {
      return false
    }

    ctx.world.addComponent(caster, 'channel', {
      structure,
      remaining: P.duration,
      tick: P.tick,
      tickTimer: P.tick,
      repair: P.repair * P.tick * caster.caster.healPower,
      reclaims: caster.laneFollower?.stance === 'hold',
    })

    caster.targeting.target = null

    return true
  },
}
