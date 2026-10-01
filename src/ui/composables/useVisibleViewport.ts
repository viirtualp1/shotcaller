import { useEventListener } from '@vueuse/core'
import { computed, shallowRef } from 'vue'

/** Fixed windows must follow the part of the page above the mobile keyboard. */
export function useVisibleViewport() {
  const viewport = globalThis.window?.visualViewport
  const bounds = shallowRef<{ height: number; bottom: number } | null>(null)

  const style = computed(() =>
    bounds.value
      ? {
          '--visible-height': `${bounds.value.height}px`,
          '--visible-bottom': `${bounds.value.bottom}px`,
        }
      : {},
  )

  function update() {
    if (!viewport) {
      return
    }

    bounds.value = {
      height: viewport.height,
      bottom: Math.max(0, globalThis.window.innerHeight - viewport.offsetTop - viewport.height),
    }
  }

  useEventListener(viewport, 'resize', update)
  useEventListener(viewport, 'scroll', update)
  useEventListener(globalThis.window, 'resize', update)
  update()

  return { style }
}
