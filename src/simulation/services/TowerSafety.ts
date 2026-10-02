import { BATTLE } from '@/content/rules'
import type { TeamId } from '@/content/ids'
import { distance, type Vec2 } from '@/core/math/vec2'
import { isAlive, type Unit } from '../ecs/components'
import type { Queries } from '../ecs/queries'
import type { SpatialIndex } from './SpatialIndex'

const TANK_MARGIN = 4
const PROTECTION_MARGIN = 12

export function isThroneNearlyDown(unit: Unit) {
  return (
    unit.structure?.type === 'throne' &&
    isAlive(unit) &&
    unit.health.current / unit.health.max < BATTLE.hero.finishThroneBelow
  )
}

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

  reset() {
    this.tankedCache.clear()
  }

  isTanked(structure: Unit, team: TeamId) {
    const cached = this.tankedCache.get(structure) ?? [undefined, undefined]
    const known = cached[team]
    if (known !== undefined) {
      return known
    }

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

  isProtected(target: Unit, attackerTeam: TeamId) {
    return this.threatAt(target.position, attackerTeam, PROTECTION_MARGIN)
  }

  isUnsafe(team: TeamId, point: Vec2) {
    return this.threatAt(point, team, BATTLE.towerSafetyMargin)
  }

  /** Like `isUnsafe`, but a wounded hero also fears towers that creeps are tanking. */
  isUnsafeFor(hero: Unit, point: Vec2) {
    const wounded = hero.health.current / hero.health.max < BATTLE.hero.towerRetreatHealth

    return this.threatAt(point, hero.team, BATTLE.towerSafetyMargin, wounded)
  }

  canHitStructure(hero: Unit, structure: Unit) {
    if (this.isTanked(structure, hero.team)) {
      return true
    }

    const { finishStructureBelow, finishStructureIfHealthAbove } = BATTLE.hero
    return (
      structure.health.current / structure.health.max < finishStructureBelow &&
      hero.health.current / hero.health.max > finishStructureIfHealthAbove
    )
  }

  private threatAt(point: Vec2, team: TeamId, margin: number, ignoreTanks = false) {
    for (const structure of this.queries.structures) {
      if (structure.team === team || !isAlive(structure)) {
        continue
      }

      /* Structures shoot edge to edge, so a hero standing at `point` is in reach well before its centre is. */
      const range = (structure.attack?.range ?? 0) + structure.radius + BATTLE.hero.radius + margin
      if (distance(structure.position, point) <= range && (ignoreTanks || !this.isTanked(structure, team))) {
        return true
      }
    }

    return false
  }
}
