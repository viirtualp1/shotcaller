import { BATTLE } from '@/content/rules'
import type { TeamId } from '@/content/ids'
import { distance, type Vec2 } from '@/core/math/vec2'
import { isAlive, type Unit } from '../ecs/components'
import type { Queries } from '../ecs/queries'
import type { SpatialIndex } from './SpatialIndex'
import type { LaneMap } from '../map/LaneMap'

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
    private readonly map: LaneMap,
    private readonly soloPush = false,
  ) {}

  reset() {
    this.tankedCache.clear()
  }

  /** A throne opens only after all towers on at least one lane have fallen. */
  isStructureVulnerable(structure: Unit) {
    return (
      structure.structure?.type !== 'throne' ||
      this.map.lanes.some(
        (lane) =>
          !this.queries.structures.entities.some(
            (tower) =>
              tower.team === structure.team &&
              tower.structure.type === 'tower' &&
              tower.structure.lane === lane &&
              isAlive(tower),
          ),
      )
    )
  }

  /** The first standing enemy tower on this creep's path blocks the rest of the lane. */
  blockingTower(unit: Unit) {
    const path = unit.laneFollower?.path
    if (unit.kind !== 'creep' || !path || unit.training?.goal === 'dummies') {
      return null
    }

    let first: Unit | null = null
    let firstAlong = Infinity

    for (const tower of this.queries.structures) {
      if (
        tower.team === unit.team ||
        tower.structure.type !== 'tower' ||
        tower.structure.lane !== path.lane ||
        !isAlive(tower)
      ) {
        continue
      }

      const along = this.map.project(path, tower.position).along
      if (along < firstAlong) {
        first = tower
        firstAlong = along
      }
    }

    return first
  }

  isBeyondTower(unit: Unit, target: Unit) {
    const tower = this.blockingTower(unit)
    const path = unit.laneFollower?.path
    return Boolean(
      tower &&
      path &&
      target !== tower &&
      this.map.project(path, target.position).along > this.map.project(path, tower.position).along,
    )
  }

  /** Also applied after collisions, so an allied crowd cannot push a creep through the tower. */
  constrainCreep(unit: Unit) {
    const tower = this.blockingTower(unit)
    const path = unit.laneFollower?.path
    if (!tower || !path) {
      return
    }

    const limit = this.map.project(path, tower.position).along - tower.radius - unit.radius - 1
    const projection = this.map.project(path, unit.position)
    if (projection.along > limit) {
      const point = this.map.pointAt(path, limit)
      unit.position.x += point.x - projection.point.x
      unit.position.y += point.y - projection.point.y
    }
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
    if (!this.isStructureVulnerable(structure)) {
      return false
    }

    if (this.soloPush) {
      return true
    }

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
    if (this.soloPush) {
      return false
    }

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
