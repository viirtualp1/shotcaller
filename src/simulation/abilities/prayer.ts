import { ABILITY_PARAMS } from '@/content/abilities'
import type { Ability } from './Ability'
import { alliedHeroesAround, healthRatio, weakest } from './selectors'

const P = ABILITY_PARAMS.prayer

export const prayer: Ability = {
  id: 'prayer',
  cast(caster, ctx) {
    const target = weakest(
      alliedHeroesAround(ctx, caster, P.radius).filter((u) => healthRatio(u) < P.hpThreshold),
    )

    if (!target) {
      return false
    }

    ctx.combat.heal(target, P.heal * caster.caster.healPower, caster)

    return true
  },
}
