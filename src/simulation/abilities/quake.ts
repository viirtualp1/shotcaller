import { ABILITY_PARAMS } from '@/content/abilities'
import type { Ability } from './Ability'
import { enemiesAround, stun } from './selectors'

const P = ABILITY_PARAMS.quake

export const quake: Ability = {
  id: 'quake',
  cast(caster, ctx) {
    const victims = enemiesAround(ctx, caster, caster.position, P.radius)
    const worthIt = victims.some((u) => u.kind === 'hero') || victims.length >= P.minTargets
    if (!worthIt) return false
    for (const victim of victims) {
      ctx.combat.dealDamage(caster, victim, P.damage * caster.caster.power, 'magical')
      stun(victim, P.stun)
    }
    ctx.events.emit('burst', { at: { ...caster.position }, radius: P.radius, color: 0xd7b98a })
    return true
  },
}
