import { useMediaQuery, useWindowSize } from '@vueuse/core'
import { computed } from 'vue'
import { clamp } from '@/core/math/vec2'

/**
 * Desktop screens are laid out for a 1152 × 720 window and grow with a bigger one, the way games scale their
 * interface, up to half again their size. Phones keep their own layout at its natural size.
 */
const BASE_WIDTH = 1152
const BASE_HEIGHT = 720
const MAX_ZOOM = 1.5

export function useUiZoom() {
  const phone = useMediaQuery('(max-width: 860px)')
  const viewport = useWindowSize()

  return computed(() => {
    if (phone.value) {
      return 1
    }

    const fit = Math.min(viewport.width.value / BASE_WIDTH, viewport.height.value / BASE_HEIGHT)

    return Math.round(clamp(fit, 1, MAX_ZOOM) * 100) / 100
  })
}
