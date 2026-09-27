import { ABILITY_PARAMS } from '@/content/abilities'
import { isAlive } from '../ecs/components'
import type { Ability } from './Ability'
import { enemiesAround, nearest } from './selectors'

const P = ABILITY_PARAMS.barrel

export const barrel: Ability = {
  id: 'barrel',
  cast(caster, ctx) {
    const current = caster.targeting.target
    const target =
      current && isAlive(current)
        ? current
        : nearest(
            caster.position,
            enemiesAround(ctx, caster, caster.position, caster.attack.range + P.rangeBonus, {
              includeStructures: true,
            }),
          )
    if (!target) return false
    const at = { ...target.position }
    ctx.combat.splash(caster, at, P.radius, P.damage * caster.caster.power, 'magical', {
      includeStructures: true,
      structureBonus: P.structureBonus,
    })
    ctx.events.emit('burst', { at, radius: P.radius, color: 0xf4a64b })
    return true
  },
}
