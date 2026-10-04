import type { Ability } from './Ability'
import { alliedHeroesAround, coresFirst, healthRatio } from './selectors'
import { paramsOf } from './params'

export const prayer: Ability = {
  id: 'prayer',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'prayer')

    const targets = coresFirst(
      alliedHeroesAround(ctx, caster, P.radius).filter((u) => healthRatio(u) < P.hpThreshold),
    ).slice(0, P.targets)

    for (const target of targets) {
      ctx.combat.heal(target, P.heal * caster.caster.healPower, caster)
    }

    return targets.length > 0
  },
}
