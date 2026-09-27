import { direction, distance, offset, type Vec2 } from '@/core/math/vec2'
import { isAlive, type HeroUnit, type Unit } from '../ecs/components'
import { withinLaneBand } from '../services/laneBand'
import type { SimulationContext } from '../SimulationContext'

export interface EnemyFilter {
  readonly heroesOnly?: boolean
  readonly includeStructures?: boolean
  readonly excludeProtected?: boolean
}

export function enemiesAround(
  ctx: SimulationContext,
  caster: Unit,
  center: Vec2,
  radius: number,
  filter: EnemyFilter = {},
) {
  return ctx.index.near(
    center,
    radius,
    (u) =>
      u.team !== caster.team &&
      isAlive(u) &&
      (filter.includeStructures || u.kind !== 'structure') &&
      (!filter.heroesOnly || u.kind === 'hero') &&
      withinLaneBand(ctx.map, caster, u.position) &&
      (!filter.excludeProtected || !ctx.safety.isProtected(u, caster.team)),
  )
}

export function alliedHeroesAround(ctx: SimulationContext, caster: Unit, radius: number) {
  return ctx.index.near(
    caster.position,
    radius,
    (u) => u.team === caster.team && u.kind === 'hero' && isAlive(u),
  )
}

export const byDistance = (from: Vec2) => (a: Unit, b: Unit) =>
  distance(from, a.position) - distance(from, b.position)

export const nearest = (from: Vec2, units: readonly Unit[]) => [...units].sort(byDistance(from))[0]

export const farthest = (from: Vec2, units: readonly Unit[]) => [...units].sort(byDistance(from)).at(-1)

export const healthRatio = (u: Unit) => u.health.current / u.health.max

export const weakest = (units: readonly Unit[]) =>
  [...units].sort((a, b) => healthRatio(a) - healthRatio(b))[0]

export function densest(ctx: SimulationContext, caster: Unit, searchRadius: number, clusterRadius: number) {
  const candidates = enemiesAround(ctx, caster, caster.position, searchRadius)
  let best: Unit | undefined
  let bestScore = 0
  for (const c of candidates) {
    const score =
      candidates.filter((o) => distance(o.position, c.position) <= clusterRadius).length +
      (c.kind === 'hero' ? 1 : 0)

    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }

  return best
}

export const heroesFirst = (units: readonly Unit[]) => {
  const heroes = units.filter((u) => u.kind === 'hero')
  return heroes.length ? heroes : units
}

/** Places the caster touching the target, on the side given by `from`. */
export function contactPoint(caster: HeroUnit, target: Unit, from: Vec2) {
  return offset(target.position, direction(target.position, from), caster.radius + target.radius + 2)
}

export function stun(target: Unit, seconds: number) {
  target.status.stun = Math.max(target.status.stun, seconds)
}
