import { LANE_IDS, TEAM_IDS, type LaneId, type TeamId } from '@/content/ids'
import { BASES, LANE_WAYPOINTS } from '@/content/map'
import { BATTLE } from '@/content/rules'
import { vec2, type Vec2 } from '@/core/math/vec2'

export interface LanePath {
  readonly lane: LaneId
  readonly points: readonly Vec2[]
  readonly cumulative: readonly number[]
  readonly length: number
}

export interface PathProjection {
  readonly distance: number
  readonly segment: number
  readonly along: number
  readonly point: Vec2
}

function buildPath(lane: LaneId, points: readonly Vec2[]): LanePath {
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    cumulative.push(cumulative[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y))
  }

  return {
    lane,
    points,
    cumulative,
    length: cumulative[cumulative.length - 1]!,
  }
}

export class LaneMap {
  private readonly paths: Record<TeamId, Record<LaneId, LanePath>>

  constructor() {
    const forward = (lane: LaneId) => LANE_WAYPOINTS[lane].map(([x, y]) => vec2(x, y))

    const build = (team: TeamId) =>
      Object.fromEntries(
        LANE_IDS.map((lane) => {
          const points = forward(lane)
          return [lane, buildPath(lane, team === 0 ? points : [...points].reverse())]
        }),
      ) as Record<LaneId, LanePath>

    this.paths = {
      0: build(0),
      1: build(1),
    }
  }

  base(team: TeamId) {
    const [x, y] = BASES[team]
    return vec2(x, y)
  }

  /** Path from the team's own base to the enemy base. */
  path(team: TeamId, lane: LaneId) {
    return this.paths[team][lane]
  }

  segmentAt(path: LanePath, along: number) {
    let i = 0
    while (i < path.points.length - 2 && path.cumulative[i + 1]! < along) {
      i++
    }

    return i
  }

  pointAt(path: LanePath, along: number) {
    const s = Math.max(0, Math.min(path.length, along))
    const i = this.segmentAt(path, s)
    const a = path.points[i]!
    const b = path.points[i + 1]!
    const start = path.cumulative[i]!
    const span = path.cumulative[i + 1]! - start
    const t = span > 0 ? (s - start) / span : 0
    return vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
  }

  tangentAt(path: LanePath, along: number) {
    const a = this.pointAt(path, along)
    const b = this.pointAt(path, along + 1)
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
    return vec2((b.x - a.x) / d, (b.y - a.y) / d)
  }

  project(path: LanePath, p: Vec2) {
    let best: PathProjection = {
      distance: Infinity,
      segment: 0,
      along: 0,
      point: p,
    }

    for (let i = 0; i < path.points.length - 1; i++) {
      const a = path.points[i]!
      const b = path.points[i + 1]!
      const vx = b.x - a.x
      const vy = b.y - a.y
      const lengthSq = vx * vx + vy * vy
      const t = lengthSq ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / lengthSq)) : 0
      const point = vec2(a.x + vx * t, a.y + vy * t)
      const distance = Math.hypot(p.x - point.x, p.y - point.y)
      if (distance < best.distance) {
        best = {
          distance,
          segment: i,
          along: path.cumulative[i]! + Math.sqrt(lengthSq) * t,
          point,
        }
      }
    }

    return best
  }

  /** Same answer as `project(path, p).distance <= maxDistance`, but stops at the first segment close enough. */
  isWithin(path: LanePath, p: Vec2, maxDistance: number) {
    for (let i = 0; i < path.points.length - 1; i++) {
      const a = path.points[i]!
      const b = path.points[i + 1]!
      const vx = b.x - a.x
      const vy = b.y - a.y
      const lengthSq = vx * vx + vy * vy
      const t = lengthSq ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / lengthSq)) : 0
      const dx = p.x - (a.x + vx * t)
      const dy = p.y - (a.y + vy * t)
      // The distance is never shorter than either leg, so far segments are ruled out without Math.hypot.
      if (Math.abs(dx) <= maxDistance && Math.abs(dy) <= maxDistance && Math.hypot(dx, dy) <= maxDistance) {
        return true
      }
    }

    return false
  }

  towerAlong(path: LanePath) {
    return path.length * BATTLE.towerFraction
  }

  towerPosition(team: TeamId, lane: LaneId) {
    const path = this.path(team, lane)
    return this.pointAt(path, this.towerAlong(path))
  }

  nearestLane(p: Vec2, maxDistance = Infinity) {
    let best: LaneId | null = null
    let bestDistance = maxDistance
    for (const lane of LANE_IDS) {
      const { distance } = this.project(this.path(0, lane), p)
      if (distance < bestDistance) {
        bestDistance = distance
        best = lane
      }
    }

    return best
  }

  allPaths() {
    return TEAM_IDS.flatMap((team) => LANE_IDS.map((lane) => this.path(team, lane)))
  }
}

export const DEFAULT_LANE_MAP = new LaneMap()
