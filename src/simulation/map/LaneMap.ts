import { TEAM_IDS, type LaneId, type ModeId, type TeamId, type TowerSlot } from '@/content/ids'
import { MAPS, type MapDefinition } from '@/content/map'
import { DEFAULT_MODE, MODES } from '@/content/modes'
import { BATTLE } from '@/content/rules'
import { length, vec2, type Vec2 } from '@/core/math/vec2'

/** Room around the lanes for the heroes, creeps and towers standing on them. */
const CONTENT_PADDING = 45

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
    cumulative.push(cumulative[i - 1]! + length(b.x - a.x, b.y - a.y))
  }

  return {
    lane,
    points,
    cumulative,
    length: cumulative[cumulative.length - 1]!,
  }
}

/** The board of one game mode: its lanes, towers and relics. */
export class LaneMap {
  readonly definition: MapDefinition
  /** The mode's lanes; the others are not on this board. */
  readonly lanes: readonly LaneId[]
  private readonly paths: Record<TeamId, Partial<Record<LaneId, LanePath>>>

  constructor(readonly mode: ModeId = DEFAULT_MODE) {
    this.definition = MAPS[mode]
    this.lanes = MODES[mode].lanes

    const forward = (lane: LaneId) => (this.definition.lanes[lane] ?? []).map(([x, y]) => vec2(x, y))

    const build = (team: TeamId) =>
      Object.fromEntries(
        this.lanes.map((lane) => {
          const points = forward(lane)
          return [lane, buildPath(lane, team === 0 ? points : [...points].reverse())]
        }),
      ) as Partial<Record<LaneId, LanePath>>

    this.paths = {
      0: build(0),
      1: build(1),
    }
  }

  base(team: TeamId) {
    const [x, y] = this.definition.bases[team]
    return vec2(x, y)
  }

  /** Path from the team's own base to the enemy base. */
  path(team: TeamId, lane: LaneId) {
    const path = this.paths[team][lane]
    if (!path) {
      throw new Error(`No ${lane} lane in ${this.mode}`)
    }

    return path
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
    const d = length(b.x - a.x, b.y - a.y) || 1
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
      const distance = length(p.x - point.x, p.y - point.y)
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
      // The distance is never shorter than either leg, so far segments are ruled out without a square root.
      if (Math.abs(dx) <= maxDistance && Math.abs(dy) <= maxDistance && length(dx, dy) <= maxDistance) {
        return true
      }
    }

    return false
  }

  towerPosition(team: TeamId, slot: TowerSlot) {
    const spot = this.definition.towers[slot]
    if (!spot) {
      throw new Error(`No ${slot} tower in ${this.mode}`)
    }

    const path = this.path(team, spot.lane)
    return this.pointAt(path, path.length * spot.along)
  }

  /** How far from its own base the lane's outermost tower stands. */
  frontTowerAlong(path: LanePath) {
    const shares = Object.values(this.definition.towers)
      .filter((spot) => spot.lane === path.lane)
      .map((spot) => spot.along)

    return path.length * Math.max(0, ...shares)
  }

  relicPositions() {
    return this.definition.relics.map(([x, y]) => vec2(x, y))
  }

  /** The part of the board where anything happens: lanes, bases and towers, with room for the units on them. */
  contentBounds() {
    const points = [
      ...this.allPaths().flatMap((path) => path.points),
      ...TEAM_IDS.map((team) => this.base(team)),
      ...TEAM_IDS.flatMap((team) => MODES[this.mode].towers.map((slot) => this.towerPosition(team, slot))),
    ]

    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const x = Math.max(0, Math.min(...xs) - CONTENT_PADDING)
    const y = Math.max(0, Math.min(...ys) - CONTENT_PADDING)

    return {
      x,
      y,
      width: Math.min(BATTLE.worldSize, Math.max(...xs) + CONTENT_PADDING) - x,
      height: Math.min(BATTLE.worldSize, Math.max(...ys) + CONTENT_PADDING) - y,
    }
  }

  nearestLane(p: Vec2, maxDistance = Infinity) {
    let best: LaneId | null = null
    let bestDistance = maxDistance
    for (const lane of this.lanes) {
      const { distance } = this.project(this.path(0, lane), p)
      if (distance < bestDistance) {
        bestDistance = distance
        best = lane
      }
    }

    return best
  }

  allPaths() {
    return TEAM_IDS.flatMap((team) => this.lanes.map((lane) => this.path(team, lane)))
  }
}

const cache = new Map<ModeId, LaneMap>()

/** Maps are immutable, so each mode builds its paths once. */
export function laneMapFor(mode: ModeId) {
  let map = cache.get(mode)
  if (!map) {
    map = new LaneMap(mode)
    cache.set(mode, map)
  }

  return map
}

export const DEFAULT_LANE_MAP = laneMapFor(DEFAULT_MODE)
