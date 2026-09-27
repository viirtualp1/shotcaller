import { ABILITY_PARAMS } from '@/content/abilities'
import type { Ability } from './Ability'
import { enemiesAround, nearest, weakest } from './selectors'

const P = ABILITY_PARAMS.poisonDagger
const DAGGER_SPEED = 650

export const poisonDagger: Ability = {
  id: 'poisonDagger',
  cast(caster, ctx) {
    const target =
      weakest(enemiesAround(ctx, caster, caster.position, P.radius, { heroesOnly: true })) ??
      nearest(caster.position, enemiesAround(ctx, caster, caster.position, P.radius))
    if (!target) return false
    const power = caster.caster.power
    ctx.factory.projectile(
      {
        source: caster,
        target,
        speed: DAGGER_SPEED,
        damage: P.damage * power,
        damageType: 'physical',
        splash: 0,
        visual: 'dagger',
        poison: { damage: P.poison * power, tick: P.tick, duration: P.duration, slow: P.slow },
      },
      caster.color,
    )
    return true
  },
}
