import { BATTLE } from '@/content/rules'
import type { TeamId } from '@/content/ids'
import { distance, type Vec2 } from '@/core/math/vec2'
import { isAlive, type Unit } from '../ecs/components'
import type { Queries } from '../ecs/queries'
import type { SpatialIndex } from './SpatialIndex'

const TANK_MARGIN = 4
const PROTECTION_MARGIN = 12

/**
 * Heroes only walk under an enemy structure while their own creeps or turrets absorb its shots,
 * which is what keeps lanes from collapsing into tower dives.
 */
export class TowerSafety {
  private readonly tankedCache = new Map<Unit, [boolean | undefined, boolean | undefined]>()

  constructor(
    private readonly queries: Queries,
    private readonly index: SpatialIndex,
  ) {}

  reset(): void {
    this.tankedCache.clear()
  }

  isTanked(structure: Unit, team: TeamId): boolean {
    const cached = this.tankedCache.get(structure) ?? [undefined, undefined]
    const known = cached[team]
    if (known !== undefined) return known
    const range = (structure.attack?.range ?? 0) + TANK_MARGIN
    const tanked =
      this.index.near(
        structure.position,
        range,
        (u) => u.team === team && isAlive(u) && (u.kind === 'creep' || u.kind === 'turret'),
      ).length > 0
    cached[team] = tanked
    this.tankedCache.set(structure, cached)
    return tanked
  }

  isProtected(target: Unit, attackerTeam: TeamId): boolean {
    return this.threatAt(target.position, attackerTeam, PROTECTION_MARGIN)
  }

  isUnsafe(team: TeamId, point: Vec2): boolean {
    return this.threatAt(point, team, BATTLE.towerSafetyMargin)
  }

  canHitStructure(hero: Unit, structure: Unit): boolean {
    if (this.isTanked(structure, hero.team)) return true
    const { finishStructureBelow, finishStructureIfHealthAbove } = BATTLE.hero
    return (
      structure.health.current / structure.health.max < finishStructureBelow &&
      hero.health.current / hero.health.max > finishStructureIfHealthAbove
    )
  }

  private threatAt(point: Vec2, team: TeamId, margin: number): boolean {
    for (const structure of this.queries.structures) {
      if (structure.team === team || !isAlive(structure)) continue
      const range = (structure.attack?.range ?? 0) + margin
      if (distance(structure.position, point) <= range && !this.isTanked(structure, team)) return true
    }
    return false
  }
}
