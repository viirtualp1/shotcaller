import type { Ability } from './Ability'
import { byDistance, enemiesAround } from './selectors'
import { paramsOf } from './params'

export const volley: Ability = {
  id: 'volley',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'volley')

    const targets = enemiesAround(ctx, caster, caster.position, caster.attack.range + P.rangeBonus)
      .sort(byDistance(caster.position))
      .slice(0, P.arrows)

    for (const target of targets) {
      ctx.factory.projectile(
        {
          source: caster,
          target,
          speed: P.speed,
          damage: P.damage * caster.caster.power,
          damageType: 'magical',
          splash: 0,
          visual: 'arrow',
        },
        caster.color ?? 0xffffff,
      )
    }

    return targets.length > 0
  },
}
