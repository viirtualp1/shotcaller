import { ABILITY_PARAMS } from '@/content/abilities'
import type { Ability } from './Ability'
import { enemiesAround } from './selectors'

const P = ABILITY_PARAMS.raiseDead
const SPREAD = 16

/** Rounds away the last bits `sin` and `cos` may disagree on between browsers; 1/1024 is exact in binary. */
const snap = (value: number) => Math.round(value * 1024) / 1024

export const raiseDead: Ability = {
  id: 'raiseDead',
  cast(caster, ctx) {
    if (!enemiesAround(ctx, caster, caster.position, P.triggerRadius, { includeStructures: true }).length) {
      return false
    }

    for (let i = 0; i < P.count; i++) {
      const angle = (i / P.count) * Math.PI * 2
      ctx.factory.skeleton(caster, {
        x: caster.position.x + snap(Math.cos(angle) * SPREAD),
        y: caster.position.y + snap(Math.sin(angle) * SPREAD),
      })
    }

    ctx.events.emit('burst', {
      at: { ...caster.position },
      radius: 40,
      color: 0x9fd0a0,
    })

    return true
  },
}
