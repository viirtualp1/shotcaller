import { clamp } from '@/core/math/vec2'
import type { Rect } from './fitMap'

/** How a zoomed view sits over the fitted map: a scale and an offset in screen pixels. */
export interface LensState {
  readonly x: number
  readonly y: number
  readonly scale: number
}

/** The screen space left for the map, as `mapArea` returns it. */
export interface LensArea {
  readonly width: number
  readonly height: number
  readonly centerX: number
  readonly centerY: number
}

export const MAX_ZOOM = 3

export const IDENTITY_LENS: LensState = {
  x: 0,
  y: 0,
  scale: 1,
}

/**
 * Holds the point under the centre of the area on one axis so the board's edge never comes further in than the area's.
 * A board narrower than the view stays where the unzoomed view had it.
 */
function clampAxis(
  offset: number,
  scale: number,
  center: number,
  size: number,
  start: number,
  length: number,
) {
  const middle = start + length / 2
  const slack = length / 2 - size / (2 * scale)
  const looked = (center - offset) / scale
  const point = slack <= 0 ? center : clamp(looked, middle - slack, middle + slack)

  return center - scale * point
}

/**
 * Keeps a zoomed view over the board. `board` is the painted board in the lens's own space, which may reach past the
 * lanes and under the panels; at the smallest zoom the lens returns to where it started.
 */
export function clampLens(lens: LensState, area: LensArea, board: Rect): LensState {
  if (lens.scale <= 1) {
    return IDENTITY_LENS
  }

  const scale = Math.min(lens.scale, MAX_ZOOM)

  return {
    x: clampAxis(lens.x, scale, area.centerX, area.width, board.x, board.width),
    y: clampAxis(lens.y, scale, area.centerY, area.height, board.y, board.height),
    scale,
  }
}

/** Scales the lens by `factor` around a screen point, which stays over the same spot of the map. */
export function zoomLens(lens: LensState, factor: number, anchorX: number, anchorY: number): LensState {
  const scale = clamp(lens.scale * factor, 1, MAX_ZOOM)
  const ratio = scale / lens.scale

  return {
    x: anchorX - (anchorX - lens.x) * ratio,
    y: anchorY - (anchorY - lens.y) * ratio,
    scale,
  }
}

/** The lens that centres `box` (in the lens's own space) in the area, as close as `padding` and the zoom range allow. */
export function frameLens(
  box: Rect,
  area: LensArea,
  padding: number,
  minZoom: number,
  maxZoom: number,
): LensState {
  const fits = Math.min(area.width / (box.width + padding * 2), area.height / (box.height + padding * 2))
  const scale = clamp(fits, minZoom, maxZoom)

  return {
    x: area.centerX - scale * (box.x + box.width / 2),
    y: area.centerY - scale * (box.y + box.height / 2),
    scale,
  }
}

/** Moves a lens part of the way, `amount` between 0 and 1, towards another. */
export function blendLens(from: LensState, to: LensState, amount: number): LensState {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    scale: from.scale + (to.scale - from.scale) * amount,
  }
}
