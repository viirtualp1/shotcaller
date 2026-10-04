import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'

/** The desktop match interface uses the same fixed enlargement as 110% browser zoom. */
const DESKTOP_ZOOM = 1.1

export function useGameUiZoom() {
  const desktop = useMediaQuery('(min-width: 1100px) and (pointer: fine)')

  return computed(() => (desktop.value ? DESKTOP_ZOOM : 1))
}
