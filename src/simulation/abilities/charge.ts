import { ABILITY_PARAMS } from '@/content/abilities'
import type { Ability } from './Ability'
import { contactPoint, enemiesAround, farthest, heroesFirst, stun } from './selectors'

const P = ABILITY_PARAMS.charge

export const charge: Ability = {
  id: 'charge',
  cast(caster, ctx) {
    const candidates = enemiesAround(ctx, caster, caster.position, P.radius, { excludeProtected: true })
    const target = farthest(caster.position, heroesFirst(candidates))
    if (!target) {
      return false
    }

    const from = { ...caster.position }
    Object.assign(caster.position, contactPoint(caster, target, caster.position))

    ctx.events.emit('dash', {
      from,
      to: { ...caster.position },
      color: caster.color ?? 0xffffff,
    })

    ctx.combat.dealDamage(caster, target, P.damage * caster.caster.power, 'magical')
    stun(target, P.stun)
    caster.targeting.target = target

    return true
  },
}
