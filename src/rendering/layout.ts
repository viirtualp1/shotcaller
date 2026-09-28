import type { LaneId, TeamId } from '@/content/ids'
import type { LaneMap } from '@/simulation/map/LaneMap'

const STAGE_AHEAD_OF_TOWER = 55
const TOKEN_SPACING = 30

/** Where a planned hero token stands: just in front of its own tower, fanned across the lane. */
export function stagingPosition(map: LaneMap, team: TeamId, lane: LaneId, index: number, count: number) {
  const path = map.path(team, lane)
  const along = map.frontTowerAlong(path) + STAGE_AHEAD_OF_TOWER
  const center = map.pointAt(path, along)
  const tangent = map.tangentAt(path, along)
  const spread = (index - (count - 1) / 2) * TOKEN_SPACING
  return {
    x: center.x - tangent.y * spread,
    y: center.y + tangent.x * spread,
  }
}
