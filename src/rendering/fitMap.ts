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

const MAP_MARGIN = 12
const MIN_MAP_SIZE = 200

/**
 * Where the board goes in the space the HUD leaves free: `focus` is made as large as fits and centred there.
 * The whole board is the default; a tighter focus lets the empty edges run under the panels.
 */
export function fitMap(width: number, height: number, insets: Insets, focus: Rect = WHOLE_BOARD) {
  const { top, right, bottom, left } = insets
  const availableWidth = Math.max(MIN_MAP_SIZE, width - left - right - MAP_MARGIN * 2)
  const availableHeight = Math.max(MIN_MAP_SIZE, height - top - bottom - MAP_MARGIN * 2)
  const scale = Math.min(availableWidth / focus.width, availableHeight / focus.height)
  const centerX = left + MAP_MARGIN + availableWidth / 2
  const centerY = top + MAP_MARGIN + availableHeight / 2

  return {
    x: centerX - (focus.x + focus.width / 2) * scale,
    y: centerY - (focus.y + focus.height / 2) * scale,
    scale,
    size: BATTLE.worldSize * scale,
  }
}
