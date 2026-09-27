import { ABILITY_PARAMS } from '@/content/abilities'
import type { Ability } from './Ability'
import { enemiesAround } from './selectors'

const P = ABILITY_PARAMS.raiseDead
const SPREAD = 16

export const raiseDead: Ability = {
  id: 'raiseDead',
  cast(caster, ctx) {
    if (!enemiesAround(ctx, caster, caster.position, P.triggerRadius, { includeStructures: true }).length) {
      return false
    }
    for (let i = 0; i < P.count; i++) {
      const angle = (i / P.count) * Math.PI * 2
      ctx.factory.skeleton(caster, {
        x: caster.position.x + Math.cos(angle) * SPREAD,
        y: caster.position.y + Math.sin(angle) * SPREAD,
      })
    }
    ctx.events.emit('burst', { at: { ...caster.position }, radius: 40, color: 0x9fd0a0 })
    return true
  },
}
