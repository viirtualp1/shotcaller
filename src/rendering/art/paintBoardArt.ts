import { LANE_IDS, TEAM_IDS, type LaneId } from '@/content/ids'
import { RIVER } from '@/content/map'
import { BATTLE } from '@/content/rules'
import { createRng, type Rng } from '@/core/random/rng'
import type { Vec2 } from '@/core/math/vec2'
import type { LaneMap } from '@/simulation/map/LaneMap'
import type { BoardLabels } from '../labels'
import { cssColor, FONTS, PALETTE, TEAM_COLORS } from '../theme'

const WORLD = BATTLE.worldSize

const LANE_LABEL_POSITIONS: Readonly<Record<LaneId, Vec2>> = {
  top: {
    x: 172,
    y: 168,
  },
  mid: {
    x: 455,
    y: 605,
  },
  bot: {
    x: 828,
    y: 832,
  },
}

const BASE_LABEL_POSITIONS = {
  0: {
    x: 130,
    y: 972,
  },
  1: {
    x: 870,
    y: 30,
  },
} as const

const TREE_ATTEMPTS = 1400
const TREE_LIMIT = 170

function strokePath(ctx: CanvasRenderingContext2D, points: readonly Vec2[]) {
  ctx.beginPath()
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
}

function paintGround(ctx: CanvasRenderingContext2D, rng: Rng) {
  const gradient = ctx.createRadialGradient(WORLD / 2, WORLD / 2, 100, WORLD / 2, WORLD / 2, WORLD * 0.72)
  gradient.addColorStop(0, cssColor(PALETTE.boardCenter))
  gradient.addColorStop(1, cssColor(PALETTE.boardEdge))
  ctx.fillStyle = gradient
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

function paintRiver(ctx: CanvasRenderingContext2D) {
  const points = RIVER.map(([x, y]) => ({
    x,
    y,
  }))

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
  const lanes = LANE_IDS.map((lane) => map.path(0, lane).points)

  const river = RIVER.map(([x, y]) => ({
    x,
    y,
  }))

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

    if (distanceToPolyline(p, river) < 44) {
      continue
    }

    if (bases.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 165)) {
      continue
    }

    planted++
    const size = rng.range(6, 10)
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
}

function paintLanes(ctx: CanvasRenderingContext2D, map: LaneMap, rng: Rng) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const lane of LANE_IDS) {
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

function paintBases(ctx: CanvasRenderingContext2D, map: LaneMap, labels: BoardLabels) {
  for (const team of TEAM_IDS) {
    const base = map.base(team)
    ctx.beginPath()
    ctx.arc(base.x, base.y, 105, 0, Math.PI * 2)
    ctx.fillStyle = cssColor(TEAM_COLORS[team], 0.07)
    ctx.fill()
    ctx.setLineDash([6, 8])
    ctx.strokeStyle = cssColor(TEAM_COLORS[team], 0.5)
    ctx.lineWidth = 1.6
    ctx.stroke()
    ctx.setLineDash([])
    const label = BASE_LABEL_POSITIONS[team]
    ctx.font = `700 26px ${FONTS.hand}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = cssColor(TEAM_COLORS[team], 0.8)
    ctx.fillText(labels.baseName(team), label.x, label.y)
  }
}

function paintLaneLabels(ctx: CanvasRenderingContext2D, labels: BoardLabels) {
  ctx.font = `700 32px ${FONTS.hand}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = cssColor(PALETTE.chalk, 0.5)

  for (const lane of LANE_IDS) {
    const at = LANE_LABEL_POSITIONS[lane]
    ctx.fillText(labels.laneName(lane).toLowerCase(), at.x, at.y)
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

/** Static chalkboard art rendered once through Canvas 2D (dashes and dust are cheaper here than in WebGL). */
export function paintBoardArt(map: LaneMap, labels: BoardLabels, resolution = 2048) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = resolution
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  ctx.scale(resolution / WORLD, resolution / WORLD)
  const rng = createRng('board-art')
  paintGround(ctx, rng)
  paintRiver(ctx)
  paintTrees(ctx, map, rng)
  paintLanes(ctx, map, rng)
  paintBases(ctx, map, labels)
  paintLaneLabels(ctx, labels)
  paintFrame(ctx)

  return canvas
}
