import { isAlive } from '../ecs/components'
import { trainingTargetAllowed } from '../services/training'
import type { Ability } from './Ability'
import { paramsOf } from './params'
import { enemiesAround, healthRatio, stun, weakest } from './selectors'

export const packCall: Ability = {
  id: 'packCall',
  cast(caster, ctx) {
    const p = paramsOf(caster, 'packCall')
    if (!enemiesAround(ctx, caster, caster.position, p.triggerRadius, { includeStructures: true }).length) {
      return false
    }

    const alive = ctx.queries.expiring.entities.filter(
      (unit) => unit.owner === caster && unit.creep?.summoned && isAlive(unit),
    ).length

    const count = Math.min(p.count, p.maxAlive - alive)
    if (count <= 0) {
      return false
    }

    for (let i = 0; i < count; i++) {
      ctx.factory.summon(
        caster,
        {
          x: caster.position.x + (i % 2 ? 16 : -16),
          y: caster.position.y + Math.floor(i / 2) * 18,
        },
        p,
      )
    }

    ctx.events.emit('burst', {
      at: { ...caster.position },
      radius: 55,
      color: 0xa7cb7e,
    })

    return true
  },
}

export const starfall: Ability = {
  id: 'starfall',
  cast(caster, ctx) {
    const p = paramsOf(caster, 'starfall')

    const enemies = ctx.queries.heroes.entities.filter(
      (hero) => hero.team !== caster.team && isAlive(hero) && trainingTargetAllowed(caster, hero),
    )

    const lanes = ctx.map.lanes
    let targets = enemies.filter((hero) => hero.hero.lane === lanes[0])
    for (const lane of lanes.slice(1)) {
      const group = enemies.filter((hero) => hero.hero.lane === lane)
      if (group.length > targets.length) {
        targets = group
      }
    }

    if (!targets.length) {
      return false
    }

    for (const target of targets) {
      ctx.combat.dealDamage(caster, target, p.damage * caster.caster.power, 'magical')
      stun(target, p.stun, caster)

      ctx.events.emit('burst', {
        at: { ...target.position },
        radius: 48,
        color: 0xc2a6ff,
      })
    }

    return true
  },
}

export const reap: Ability = {
  id: 'reap',
  cast(caster, ctx) {
    const p = paramsOf(caster, 'reap')
    const target = weakest(enemiesAround(ctx, caster, caster.position, p.radius, { heroesOnly: true }))
    if (!target) {
      return false
    }

    // An echo gets the same reduction to its execution threshold as to damage and stun duration.
    const execution = healthRatio(target) <= p.threshold * caster.caster.stunScale
    ctx.combat.dealDamage(
      caster,
      target,
      execution ? target.health.current : p.damage * caster.caster.power,
      'magical',
      { execution },
    )

    ctx.events.emit('burst', {
      at: { ...target.position },
      radius: 42,
      color: 0x66c5a3,
    })

    return { manaRefund: isAlive(target) ? 0 : caster.mana.max }
  },
}
