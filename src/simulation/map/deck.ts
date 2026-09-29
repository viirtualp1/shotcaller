import { TEAM_IDS } from '@/content/ids'
import { distance, length, type Vec2 } from '@/core/math/vec2'
import type { LaneMap } from './LaneMap'

/**
 * The bridge deck is the lane strip plus a round platform at each base. Bodies stay inside it,
 * so overlapping units slide along the sides instead of leaving the bridge.
 */
export function keepOnDeck(map: LaneMap, position: Vec2, radius: number) {
  const deck = map.definition.deck
  const lane = map.lanes[0]
  if (!deck || !lane) {
    return
  }

  const half = Math.max(1, deck.width / 2 - radius)
  const platform = Math.max(1, deck.platform - radius)
  const projected = map.project(map.path(0, lane), position)

  if (projected.distance <= half || onPlatform(map, position, platform)) {
    return
  }

  const nx = position.x - projected.point.x
  const ny = position.y - projected.point.y
  const n = projected.distance || 1
  let bestX = projected.point.x + (nx / n) * half
  let bestY = projected.point.y + (ny / n) * half
  let bestD = length(position.x - bestX, position.y - bestY)

  for (const team of TEAM_IDS) {
    const base = map.base(team)
    const dx = position.x - base.x
    const dy = position.y - base.y
    const d = length(dx, dy) || 1
    const x = base.x + (dx / d) * platform
    const y = base.y + (dy / d) * platform
    const gap = length(position.x - x, position.y - y)
    if (gap < bestD) {
      bestD = gap
      bestX = x
      bestY = y
    }
  }

  position.x = bestX
  position.y = bestY
}

function onPlatform(map: LaneMap, position: Vec2, platform: number) {
  for (const team of TEAM_IDS) {
    if (distance(position, map.base(team)) <= platform) {
      return true
    }
  }

  return false
}
