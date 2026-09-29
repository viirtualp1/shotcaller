import type { Graphics, StrokeInput } from 'pixi.js'

/** A fresh path per arc. Continuing the previous one makes Pixi stroke a line out to the origin. */
export function strokeArc(g: Graphics, radius: number, from: number, to: number, style: StrokeInput) {
  g.beginPath().arc(0, 0, radius, from, to).stroke(style)
}

export interface BarSpec {
  readonly y: number
  readonly width: number
  readonly height: number
  readonly ratio: number
  readonly color: number
}

export function drawBar(g: Graphics, { y, width, height, ratio, color }: BarSpec) {
  const x = -width / 2
  g.rect(x - 0.5, y - 0.5, width + 1, height + 1).fill({
    color: 0x000000,
    alpha: 0.55,
  })

  g.rect(x, y, width * Math.max(0, Math.min(1, ratio)), height).fill(color)
}
