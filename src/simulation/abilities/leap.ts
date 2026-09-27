import { ABILITY_PARAMS } from '@/content/abilities'
import type { Ability } from './Ability'
import { densest, enemiesAround, stun } from './selectors'

const P = ABILITY_PARAMS.leap

export const leap: Ability = {
  id: 'leap',
  cast(caster, ctx) {
    const center = densest(ctx, caster, P.searchRadius, P.radius)
    if (!center || ctx.safety.isProtected(center, caster.team)) {
      return false
    }

    const from = { ...caster.position }
    const landing = { ...center.position }
    Object.assign(caster.position, landing)

    ctx.events.emit('dash', {
      from,
      to: landing,
      color: caster.color ?? 0xffffff,
    })

    for (const enemy of enemiesAround(ctx, caster, landing, P.radius)) {
      ctx.combat.dealDamage(caster, enemy, P.damage * caster.caster.power, 'magical')
      stun(enemy, P.stun)
    }

    ctx.events.emit('burst', {
      at: landing,
      radius: P.radius,
      color: 0xd7b98a,
    })

    caster.targeting.target = center

    return true
  },
}
