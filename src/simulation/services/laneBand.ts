import type { Vec2 } from '@/core/math/vec2'
import type { Unit } from '../ecs/components'
import type { LaneMap } from '../map/LaneMap'

/** How far from its own lane a lane-bound unit may look for fights. */
export const LANE_BAND = 95

/**
 * Heroes and creeps fight on their own lane; only roamers (gankers) and
 * structures ignore lanes. Lanes still meet near the bases, where everyone mixes.
 */
export function isLaneBound(unit: Unit) {
  return Boolean(unit.laneFollower) && !unit.roamer
}

export function withinLaneBand(map: LaneMap, unit: Unit, point: Vec2) {
  if (unit.training?.goal === 'dummies') {
    return true
  }

  if (!isLaneBound(unit) || !unit.laneFollower) {
    return true
  }

  return map.isWithin(unit.laneFollower.path, point, LANE_BAND)
}
