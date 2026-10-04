import type { Ability } from './Ability'
import { alliedHeroesAround, coresFirst, healthRatio } from './selectors'
import { paramsOf } from './params'

const WORTH_SHIELDING = 0.9

export const shield: Ability = {
  id: 'shield',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'shield')

    const targets = coresFirst(
      alliedHeroesAround(ctx, caster, P.radius).filter((u) => healthRatio(u) < WORTH_SHIELDING && !u.shield),
    ).slice(0, P.targets)

    for (const target of targets) {
      ctx.combat.grantShield(target, P.absorb * caster.caster.healPower, P.duration)
    }

    return targets.length > 0
  },
}
