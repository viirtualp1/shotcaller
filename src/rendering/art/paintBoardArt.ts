import { TEAM_IDS } from '@/content/ids'
import type { MapStyle, Point } from '@/content/map'
import { BATTLE } from '@/content/rules'
import { createRng, type Rng } from '@/core/random/rng'
import type { Vec2 } from '@/core/math/vec2'
import type { LaneMap } from '@/simulation/map/LaneMap'
import type { BoardLabels } from '../labels'
import { cssColor, FONTS, PALETTE, TEAM_COLORS } from '../theme'

const WORLD = BATTLE.worldSize

const TREE_ATTEMPTS = 1400
const TREE_LIMIT = 170

const toVec = ([x, y]: Point) => ({
  x,
  y,
})

function strokePath(ctx: CanvasRenderingContext2D, points: readonly Vec2[]) {
  ctx.beginPath()
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
}

/** The ground's shading, the same on the board and on the forest painted around it so the two meet without a seam. */
function groundGradient(ctx: CanvasRenderingContext2D, style: MapStyle | undefined) {
  const abyss = style === 'abyss'

  const gradient = ctx.createRadialGradient(
    WORLD / 2,
    WORLD / 2,
    abyss ? 80 : 100,
    WORLD / 2,
    WORLD / 2,
    WORLD * (abyss ? 0.75 : 0.72),
  )

  gradient.addColorStop(0, cssColor(abyss ? PALETTE.abyssCenter : PALETTE.boardCenter))
  gradient.addColorStop(1, cssColor(abyss ? PALETTE.abyssEdge : PALETTE.boardEdge))

  return gradient
}

function paintGround(ctx: CanvasRenderingContext2D, rng: Rng) {
  ctx.fillStyle = groundGradient(ctx, 'rift')
  ctx.fillRect(0, 0, WORLD, WORLD)

  for (let i = 0; i < 26; i++) {
    ctx.save()
    ctx.translate(rng.range(0, WORLD), rng.range(0, WORLD))
    ctx.rotate(rng.range(0, Math.PI))
    ctx.scale(1, rng.range(0.35, 0.65))
    ctx.beginPath()
    ctx.arc(0, 0, rng.range(40, 130), 0, Math.PI * 2)
    ctx.fillStyle = cssColor(PALETTE.chalk, 0.018)
    ctx.fill()
    ctx.restore()
  }

  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = cssColor(PALETTE.chalk, rng.range(0.02, 0.07))
    ctx.fillRect(rng.range(0, WORLD), rng.range(0, WORLD), rng.range(0.8, 2), rng.range(0.8, 2))
  }
}

function paintRiver(ctx: CanvasRenderingContext2D, river: readonly Point[]) {
  const points = river.map(toVec)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  strokePath(ctx, points)
  ctx.strokeStyle = cssColor(PALETTE.river, 0.13)
  ctx.lineWidth = 52
  ctx.stroke()
  ctx.strokeStyle = cssColor(PALETTE.river, 0.45)
  ctx.lineWidth = 1.4

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    for (let t = 0.2; t < 1; t += 0.3) {
      const x = a.x + (b.x - a.x) * t
      const y = a.y + (b.y - a.y) * t
      ctx.beginPath()
      ctx.moveTo(x - 9, y + 3)
      ctx.quadraticCurveTo(x - 4.5, y - 3, x, y + 1)
      ctx.quadraticCurveTo(x + 4.5, y + 5, x + 9, y - 1)
      ctx.stroke()
    }
  }
}

function distanceToPolyline(p: Vec2, points: readonly Vec2[]) {
  let best = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    const vx = b.x - a.x
    const vy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy || 1)))
    best = Math.min(best, Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t)))
  }

  return best
}

function paintTrees(ctx: CanvasRenderingContext2D, map: LaneMap, rng: Rng) {
  const lanes = map.lanes.map((lane) => map.path(0, lane).points)
  const river = (map.definition.river ?? []).map(toVec)

  const bases = TEAM_IDS.map((team) => map.base(team))
  let planted = 0
  for (let i = 0; i < TREE_ATTEMPTS && planted < TREE_LIMIT; i++) {
    const p = {
      x: rng.range(22, WORLD - 22),
      y: rng.range(22, WORLD - 22),
    }

    if (lanes.some((lane) => distanceToPolyline(p, lane) < 50)) {
      continue
    }

    if (river.length && distanceToPolyline(p, river) < 44) {
      continue
    }

    if (bases.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 165)) {
      continue
    }

    planted++
    paintTree(ctx, p, rng.range(6, 10))
  }
}

/** Three chalk circles. */
function paintTree(ctx: CanvasRenderingContext2D, p: Vec2, size: number) {
  ctx.fillStyle = cssColor(PALETTE.treeFill, 0.38)
  ctx.strokeStyle = cssColor(PALETTE.treeLine, 0.36)
  ctx.lineWidth = 1.3

  for (const [dx, dy] of [
    [-0.6, 0.2],
    [0.6, 0.2],
    [0, -0.55],
  ] as const) {
    ctx.beginPath()
    ctx.arc(p.x + dx * size, p.y + dy * size, size * 0.72, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

function paintLanes(ctx: CanvasRenderingContext2D, map: LaneMap, rng: Rng) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const lane of map.lanes) {
    const points = map.path(0, lane).points
    strokePath(ctx, points)
    ctx.strokeStyle = cssColor(PALETTE.chalk, 0.05)
    ctx.lineWidth = 38
    ctx.stroke()

    for (let pass = 0; pass < 2; pass++) {
      ctx.save()
      ctx.translate(rng.range(-0.8, 0.8), rng.range(-0.8, 0.8))
      strokePath(ctx, points)
      ctx.setLineDash([10, 9])
      ctx.lineDashOffset = rng.range(0, 10)
      ctx.strokeStyle = cssColor(PALETTE.chalk, 0.22 + pass * 0.1)
      ctx.lineWidth = 1.6
      ctx.stroke()
      ctx.restore()
    }
  }

  ctx.setLineDash([])
}

/** Howling Abyss: a stone bridge over the dark, with a platform around each base. */
function paintAbyss(ctx: CanvasRenderingContext2D, map: LaneMap, rng: Rng) {
  const deck = map.definition.deck
  if (!deck) {
    return
  }

  ctx.fillStyle = groundGradient(ctx, 'abyss')
  ctx.fillRect(0, 0, WORLD, WORLD)

  for (let i = 0; i < 18; i++) {
    ctx.save()
    ctx.translate(rng.range(0, WORLD), rng.range(0, WORLD))
    ctx.rotate(-Math.PI / 4)
    ctx.scale(1, rng.range(0.2, 0.4))
    ctx.beginPath()
    ctx.arc(0, 0, rng.range(60, 160), 0, Math.PI * 2)
    ctx.fillStyle = cssColor(PALETTE.frost, 0.025)
    ctx.fill()
    ctx.restore()
  }

  for (const team of TEAM_IDS) {
    const base = map.base(team)
    ctx.beginPath()
    ctx.arc(base.x, base.y, deck.platform, 0, Math.PI * 2)
    ctx.fillStyle = cssColor(PALETTE.bridge)
    ctx.fill()
    ctx.strokeStyle = cssColor(PALETTE.chalk, 0.18)
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.lineCap = 'butt'

  for (const lane of map.lanes) {
    const points = map.path(0, lane).points
    strokePath(ctx, points)
    ctx.strokeStyle = cssColor(PALETTE.bridge)
    ctx.lineWidth = deck.width
    ctx.stroke()

    const path = map.path(0, lane)
    for (let along = 0; along < path.length; along += 26) {
      const at = map.pointAt(path, along)
      const tangent = map.tangentAt(path, along)
      const half = deck.width / 2 - 6
      ctx.beginPath()
      ctx.moveTo(at.x - tangent.y * half, at.y + tangent.x * half)
      ctx.lineTo(at.x + tangent.y * half, at.y - tangent.x * half)
      ctx.strokeStyle = cssColor(PALETTE.chalk, 0.035)
      ctx.lineWidth = 1.2
      ctx.stroke()
    }

    for (const side of [-1, 1]) {
      ctx.beginPath()

      for (let along = 0; along <= path.length; along += 20) {
        const at = map.pointAt(path, along)
        const tangent = map.tangentAt(path, along)
        const x = at.x - tangent.y * side * (deck.width / 2)
        const y = at.y + tangent.x * side * (deck.width / 2)
        if (along) {
          ctx.lineTo(x, y)
        } else {
          ctx.moveTo(x, y)
        }
      }

      ctx.strokeStyle = cssColor(PALETTE.chalk, 0.22)
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
}

/** The spots where heal relics come back; the relics themselves are drawn by the battle. */
function paintRelicSpots(ctx: CanvasRenderingContext2D, map: LaneMap) {
  for (const spot of map.relicPositions()) {
    ctx.beginPath()
    ctx.arc(spot.x, spot.y, 17, 0, Math.PI * 2)
    ctx.setLineDash([4, 5])
    ctx.strokeStyle = cssColor(PALETTE.heal, 0.35)
    ctx.lineWidth = 1.6
    ctx.stroke()
  }

  ctx.setLineDash([])
}

function paintBases(ctx: CanvasRenderingContext2D, map: LaneMap, labels: BoardLabels) {
  for (const team of TEAM_IDS) {
    const [x, y] = map.definition.baseLabels[team]
    ctx.font = `700 26px ${FONTS.hand}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = cssColor(TEAM_COLORS[team], 0.8)
    ctx.fillText(labels.baseName(team), x, y)
  }
}

function paintLaneLabels(ctx: CanvasRenderingContext2D, map: LaneMap, labels: BoardLabels) {
  ctx.font = `700 32px ${FONTS.hand}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = cssColor(PALETTE.chalk, 0.5)

  for (const lane of map.lanes) {
    const at = map.definition.laneLabels[lane]
    if (at) {
      ctx.fillText(labels.laneName(lane).toLowerCase(), at[0], at[1])
    }
  }
}

function paintFrame(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = cssColor(PALETTE.chalk, 0.35)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(4, 4, WORLD - 8, WORLD - 8, 14)
  ctx.stroke()
  ctx.strokeStyle = cssColor(PALETTE.chalk, 0.12)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(11, 11, WORLD - 22, WORLD - 22, 10)
  ctx.stroke()
}

/**
 * Static chalkboard art rendered once through Canvas 2D (dashes and dust are cheaper here than in WebGL). Without
 * `frame` the board has no chalk border, for a touch screen that frames the lanes and paints the forest on past them.
 */
export function paintBoardArt(map: LaneMap, labels: BoardLabels, resolution = 2048, frame = true) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = resolution
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  ctx.scale(resolution / WORLD, resolution / WORLD)
  const rng = createRng('board-art')
  const { style, river } = map.definition

  if (style === 'abyss') {
    paintAbyss(ctx, map, rng)
  } else {
    paintGround(ctx, rng)
  }

  if (river) {
    paintRiver(ctx, river)
  }

  if (style !== 'abyss') {
    paintTrees(ctx, map, rng)
  }

  paintLanes(ctx, map, rng)
  paintRelicSpots(ctx, map)
  paintBases(ctx, map, labels)
  paintLaneLabels(ctx, map, labels)

  if (frame) {
    paintFrame(ctx)
  }

  return canvas
}

/** How far past each edge of the board the surrounding ground reaches, in board units. */
export const SURROUND_REACH = WORLD

/**
 * The ground around the board, for screens taller or wider than the lanes: the same shading carried on, with trees
 * and dust, so a phone shows forest past the lanes rather than an empty band. Drawn coarser than the board, which
 * covers its middle.
 */
export function paintSurround(map: LaneMap, resolution = 1536) {
  const span = WORLD + SURROUND_REACH * 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = resolution
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  const { style } = map.definition
  ctx.scale(resolution / span, resolution / span)
  ctx.translate(SURROUND_REACH, SURROUND_REACH)
  ctx.fillStyle = groundGradient(ctx, style)
  ctx.fillRect(-SURROUND_REACH, -SURROUND_REACH, span, span)

  const rng = createRng('board-surround')
  const outside = () => {
    for (;;) {
      const x = rng.range(-SURROUND_REACH, WORLD + SURROUND_REACH)
      const y = rng.range(-SURROUND_REACH, WORLD + SURROUND_REACH)
      if (x < 0 || y < 0 || x > WORLD || y > WORLD) {
        return {
          x,
          y,
        }
      }
    }
  }

  for (let i = 0; i < 6000; i++) {
    const p = outside()
    ctx.fillStyle = cssColor(PALETTE.chalk, rng.range(0.02, 0.07))
    ctx.fillRect(p.x, p.y, rng.range(1.2, 2.4), rng.range(1.2, 2.4))
  }

  if (style !== 'abyss') {
    for (let i = 0; i < 900; i++) {
      paintTree(ctx, outside(), rng.range(6, 10))
    }
  }

  return canvas
}
