import { ABILITY_PARAMS } from '@/content/abilities'
import type { Ability } from './Ability'
import { alliedHeroesAround, healthRatio, weakest } from './selectors'

const P = ABILITY_PARAMS.shield
const WORTH_SHIELDING = 0.9

export const shield: Ability = {
  id: 'shield',
  cast(caster, ctx) {
    const target = weakest(
      alliedHeroesAround(ctx, caster, P.radius).filter((u) => healthRatio(u) < WORTH_SHIELDING && !u.shield),
    )
    if (!target) return false
    ctx.combat.grantShield(target, P.absorb * caster.caster.power, P.duration)
    return true
  },
}
