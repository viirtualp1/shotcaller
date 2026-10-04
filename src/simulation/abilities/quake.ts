import type { Ability } from './Ability'
import { enemiesAround, stun } from './selectors'
import { paramsOf } from './params'

export const quake: Ability = {
  id: 'quake',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'quake')
    const victims = enemiesAround(ctx, caster, caster.position, P.radius)
    const worthIt = victims.some((u) => u.kind === 'hero') || victims.length >= P.minTargets
    if (!worthIt) {
      return false
    }

    for (const victim of victims) {
      ctx.combat.dealDamage(caster, victim, P.damage * caster.caster.power, 'magical')
      stun(victim, P.stun, caster)
    }

    ctx.events.emit('burst', {
      at: { ...caster.position },
      radius: P.radius,
      color: 0xd7b98a,
    })

    return true
  },
}
