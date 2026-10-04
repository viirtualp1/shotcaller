import type { Ability } from './Ability'
import { contactPoint, enemiesAround, farthest, heroesFirst, stun } from './selectors'
import { paramsOf } from './params'

export const charge: Ability = {
  id: 'charge',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'charge')
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
    stun(target, P.stun, caster)
    caster.targeting.target = target

    /* Trample: the charge carries on into the enemy heroes around the target, without stunning them. */
    if (P.splash > 0) {
      for (const enemy of enemiesAround(ctx, caster, target.position, P.splash, { heroesOnly: true })) {
        if (enemy !== target) {
          ctx.combat.dealDamage(caster, enemy, P.splashDamage * caster.caster.power, 'magical')
        }
      }

      ctx.events.emit('burst', {
        at: { ...target.position },
        radius: P.splash,
        color: caster.color ?? 0xffffff,
      })
    }

    return true
  },
}
