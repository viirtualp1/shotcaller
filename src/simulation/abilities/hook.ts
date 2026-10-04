import { direction, distance, offset } from '@/core/math/vec2'
import type { Ability } from './Ability'
import { enemiesAround, farthest, stun } from './selectors'
import { paramsOf } from './params'

export const hook: Ability = {
  id: 'hook',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'hook')

    const candidates = enemiesAround(ctx, caster, caster.position, P.radius, { heroesOnly: true }).filter(
      (u) => distance(caster.position, u.position) > P.minDistance,
    )

    const target = farthest(caster.position, candidates)
    if (!target) {
      return false
    }

    const from = { ...target.position }

    const landing = offset(
      caster.position,
      direction(caster.position, target.position),
      caster.radius + target.radius + 2,
    )

    Object.assign(target.position, landing)

    ctx.events.emit('hook', {
      from: { ...caster.position },
      to: from,
      color: caster.color ?? 0xffffff,
    })

    ctx.combat.dealDamage(caster, target, P.damage * caster.caster.power, 'magical')
    stun(target, P.stun, caster)
    caster.targeting.target = target

    return true
  },
}
