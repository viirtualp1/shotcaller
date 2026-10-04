import type { Vec2 } from '@/core/math/vec2'
import type { Unit } from '../ecs/components'
import type { Ability } from './Ability'
import { enemiesAround, nearest } from './selectors'
import { paramsOf } from './params'

export const chainLightning: Ability = {
  id: 'chainLightning',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'chainLightning')

    const first = nearest(
      caster.position,
      enemiesAround(ctx, caster, caster.position, caster.attack.range + P.rangeBonus),
    )

    if (!first) {
      return false
    }

    const struck = new Set<Unit>()
    const points: Vec2[] = [{ ...caster.position }]
    let damage = P.damage * caster.caster.power
    for (let target: Unit | undefined = first; target && struck.size < P.bounces;) {
      struck.add(target)
      points.push({ ...target.position })
      ctx.combat.dealDamage(caster, target, damage, 'magical')
      damage *= P.falloff
      const from: Unit = target
      target = nearest(
        from.position,
        enemiesAround(ctx, caster, from.position, P.bounceRange).filter((u) => !struck.has(u)),
      )
    }

    ctx.events.emit('chain', {
      points,
      color: caster.color ?? 0x6fb3ff,
    })

    return true
  },
}
