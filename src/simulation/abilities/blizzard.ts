import { ABILITY_PARAMS } from '@/content/abilities'
import type { Ability } from './Ability'
import { densest } from './selectors'

const P = ABILITY_PARAMS.blizzard

export const blizzard: Ability = {
  id: 'blizzard',
  cast(caster, ctx) {
    const center = densest(ctx, caster, caster.attack.range + P.rangeBonus, P.radius)
    if (!center) {
      return false
    }

    ctx.factory.zone(
      center.position,
      {
        source: caster,
        radius: P.radius,
        remaining: P.duration,
        tick: P.tick,
        tickTimer: 0,
        damage: P.damage * caster.caster.power,
        slow: P.slow,
      },
      0x8fd6ff,
    )

    return true
  },
}
