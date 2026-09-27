import { ABILITY_PARAMS } from '@/content/abilities'
import { direction, offset } from '@/core/math/vec2'
import type { Ability } from './Ability'
import { enemiesAround, weakest } from './selectors'

const P = ABILITY_PARAMS.backstab

export const backstab: Ability = {
  id: 'backstab',
  cast(caster, ctx) {
    const heroes = enemiesAround(ctx, caster, caster.position, P.radius, {
      heroesOnly: true,
      excludeProtected: true,
    })
    const target =
      weakest(heroes) ??
      weakest(enemiesAround(ctx, caster, caster.position, P.fallbackRadius, { excludeProtected: true }))
    if (!target) return false
    const from = { ...caster.position }
    const behind = offset(
      target.position,
      direction(caster.position, target.position),
      caster.radius + target.radius + 2,
    )
    Object.assign(caster.position, behind)
    ctx.events.emit('dash', { from, to: behind, color: caster.color ?? 0xffffff })
    ctx.combat.dealDamage(caster, target, P.damage * caster.caster.power, 'physical')
    caster.targeting.target = target
    return true
  },
}
