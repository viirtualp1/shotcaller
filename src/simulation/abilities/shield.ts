import { ABILITY_PARAMS } from '@/content/abilities'
import type { Ability } from './Ability'
import { alliedHeroesAround, healthRatio } from './selectors'

const P = ABILITY_PARAMS.shield
const WORTH_SHIELDING = 0.9

export const shield: Ability = {
  id: 'shield',
  cast(caster, ctx) {
    const targets = alliedHeroesAround(ctx, caster, P.radius)
      .filter((u) => healthRatio(u) < WORTH_SHIELDING && !u.shield)
      .sort((a, b) => healthRatio(a) - healthRatio(b))
      .slice(0, P.targets)

    for (const target of targets) {
      ctx.combat.grantShield(target, P.absorb * caster.caster.healPower, P.duration)
    }

    return targets.length > 0
  },
}
