import { TEAM_IDS } from '@/content/ids'
import { MODES } from '@/content/modes'
import { BATTLE } from '@/content/rules'
import { STRUCTURES } from '@/content/units'
import type { Vec2 } from '@/core/math/vec2'
import type { LaneMap } from '@/simulation/map/LaneMap'
import type { BoardLabels } from '../labels'
import { cssColor, PALETTE, TEAM_COLORS } from '../theme'
import { paintBoardArt } from './paintBoardArt'

/** Structures read bigger in a small picture than on the board. */
const SCALE = 1.6

function polygon(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[]) {
  ctx.beginPath()
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

function paintTower(ctx: CanvasRenderingContext2D, at: Vec2, color: number) {
  const r = STRUCTURES.tower.radius * SCALE
  const inner = r * 0.45

  polygon(ctx, [
    [at.x, at.y - r],
    [at.x + r, at.y],
    [at.x, at.y + r],
    [at.x - r, at.y],
  ])

  ctx.fillStyle = cssColor(PALETTE.ink)
  ctx.fill()
  ctx.strokeStyle = cssColor(color)
  ctx.lineWidth = 3.5
  ctx.stroke()

  polygon(ctx, [
    [at.x, at.y - inner],
    [at.x + inner, at.y],
    [at.x, at.y + inner],
    [at.x - inner, at.y],
  ])

  ctx.fillStyle = cssColor(color, 0.7)
  ctx.fill()
}

function paintThrone(ctx: CanvasRenderingContext2D, at: Vec2, color: number) {
  const r = STRUCTURES.throne.radius * SCALE

  polygon(
    ctx,
    Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 6 + (i * Math.PI) / 3
      return [at.x + Math.cos(a) * r, at.y + Math.sin(a) * r] as const
    }),
  )

  ctx.fillStyle = cssColor(PALETTE.ink)
  ctx.fill()
  ctx.strokeStyle = cssColor(color)
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(at.x, at.y, r * 0.4, 0, Math.PI * 2)
  ctx.fillStyle = cssColor(color, 0.75)
  ctx.fill()
}

function paintRelic(ctx: CanvasRenderingContext2D, at: Vec2) {
  ctx.beginPath()
  ctx.arc(at.x, at.y, 22, 0, Math.PI * 2)
  ctx.fillStyle = cssColor(PALETTE.heal, 0.25)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(at.x, at.y, 11, 0, Math.PI * 2)
  ctx.fillStyle = cssColor(PALETTE.heal, 0.9)
  ctx.fill()
}

/**
 * A mode's map as a still picture, for patch notes and the like: the board art with both sides' towers
 * and thrones standing, and the relics where the mode has them.
 */
export function paintMapPicture(map: LaneMap, labels: BoardLabels, resolution = 1024) {
  const canvas = paintBoardArt(map, labels, resolution)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  /* The board art leaves its own scale behind; start from a known one. */
  const scale = resolution / BATTLE.worldSize
  ctx.setTransform(scale, 0, 0, scale, 0, 0)

  for (const relic of map.relicPositions()) {
    paintRelic(ctx, relic)
  }

  for (const team of TEAM_IDS) {
    const color = TEAM_COLORS[team]
    for (const slot of MODES[map.mode].towers) {
      paintTower(ctx, map.towerPosition(team, slot), color)
    }

    paintThrone(ctx, map.base(team), color)
  }

  return canvas
}
