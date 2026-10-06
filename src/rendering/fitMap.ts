import { BATTLE } from '@/content/rules'

export interface Insets {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/** A rectangle in board coordinates. */
export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export const WHOLE_BOARD: Rect = {
  x: 0,
  y: 0,
  width: BATTLE.worldSize,
  height: BATTLE.worldSize,
}

export const MAP_MARGIN = 12
const MIN_MAP_SIZE = 200

/** The screen space the HUD leaves for the map, as a size and a centre. */
export function mapArea(width: number, height: number, insets: Insets) {
  const { top, right, bottom, left } = insets
  const availableWidth = Math.max(MIN_MAP_SIZE, width - left - right - MAP_MARGIN * 2)
  const availableHeight = Math.max(MIN_MAP_SIZE, height - top - bottom - MAP_MARGIN * 2)

  return {
    width: availableWidth,
    height: availableHeight,
    centerX: left + MAP_MARGIN + availableWidth / 2,
    centerY: top + MAP_MARGIN + availableHeight / 2,
  }
}

/**
 * Where the board goes in the space the HUD leaves free: `focus` is made as large as fits and centred there.
 * The whole board is the default; a tighter focus lets the empty edges run under the panels.
 */
export function fitMap(width: number, height: number, insets: Insets, focus: Rect = WHOLE_BOARD) {
  const area = mapArea(width, height, insets)
  const scale = Math.min(area.width / focus.width, area.height / focus.height)

  return {
    x: area.centerX - (focus.x + focus.width / 2) * scale,
    y: area.centerY - (focus.y + focus.height / 2) * scale,
    scale,
    size: BATTLE.worldSize * scale,
  }
}
