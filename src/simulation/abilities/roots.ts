import { ABILITY_PARAMS } from '@/content/abilities'
import { isAlive } from '../ecs/components'
import type { Ability } from './Ability'
import { alliedHeroesAround, enemiesAround, nearest } from './selectors'

const P = ABILITY_PARAMS.roots

export const roots: Ability = {
  id: 'roots',
  cast(caster, ctx) {
    const current = caster.targeting.target
    const target =
      current && isAlive(current) && current.kind !== 'structure'
        ? current
        : nearest(caster.position, enemiesAround(ctx, caster, caster.position, P.searchRadius))
    if (!target) return false
    const power = caster.caster.power
    for (const enemy of enemiesAround(ctx, caster, target.position, P.radius)) {
      enemy.status.root = Math.max(enemy.status.root, P.duration)
      ctx.combat.dealDamage(caster, enemy, P.damage * power, 'magical')
    }
    for (const ally of alliedHeroesAround(ctx, caster, P.healRadius)) ctx.combat.heal(ally, P.heal * power)
    ctx.events.emit('burst', { at: { ...target.position }, radius: P.radius, color: 0x7fe0b4 })
    return true
  },
}
