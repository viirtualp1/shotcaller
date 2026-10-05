import { useMediaQuery, useWindowSize } from '@vueuse/core'
import { computed } from 'vue'
import { clamp } from '@/core/math/vec2'

/** The desktop match interface is laid out at 110% for a 1920 × 1080 window. */
const DESKTOP_ZOOM = 1.1
const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080
/** As far as the menus grow. */
const MAX_ZOOM = 1.5
/** A laptop or Steam Deck window shorter than this plays at 100%, so the side panels fit without scrolling. */
const SHORT_HEIGHT = 900

/**
 * A bigger window enlarges the match interface with the board, the way games scale their HUD, so the side panels
 * and their text keep their share of a 1440p screen. Smaller windows keep 110%, and short ones 100%, so the side
 * panels fit their height.
 */
export function gameUiZoom(width: number, height: number) {
  const fit = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT)
  const least = height < SHORT_HEIGHT ? 1 : DESKTOP_ZOOM

  return Math.round(clamp(DESKTOP_ZOOM * fit, least, MAX_ZOOM) * 100) / 100
}

export function useGameUiZoom() {
  const desktop = useMediaQuery('(min-width: 1100px) and (pointer: fine)')
  const viewport = useWindowSize()

  return computed(() => (desktop.value ? gameUiZoom(viewport.width.value, viewport.height.value) : 1))
}
