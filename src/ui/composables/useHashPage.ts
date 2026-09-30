import { useEventListener } from '@vueuse/core'
import { shallowRef } from 'vue'

/**
 * A local page addressed by a hash, or a public page addressed by a real path. Both support browser history.
 * `parse` receives the hash, or the path prefixed with #, and returns null for another page.
 */
export function useHashPage<T>(parse: (hash: string) => T | null, format: (state: T) => string) {
  const read = () => parse(globalThis.location?.hash || `#${globalThis.location?.pathname ?? '/'}`)
  const state = shallowRef<T | null>(read())

  useEventListener(globalThis, ['hashchange', 'popstate', 'shotcaller:navigate'], () => {
    state.value = read()
  })

  function open(next: T) {
    const url = format(next)
    if (url.startsWith('#')) {
      globalThis.location.hash = url
    } else {
      globalThis.history.pushState(null, '', url)
      globalThis.dispatchEvent(new Event('shotcaller:navigate'))
    }
  }

  function replace(next: T) {
    globalThis.history.replaceState(null, '', format(next))
    state.value = next
    globalThis.dispatchEvent(new Event('shotcaller:navigate'))
  }

  /** Goes to the main page the way a link does: a new history entry, so the back button comes here again. */
  function close() {
    if (state.value === null) {
      return
    }

    globalThis.history.pushState(null, '', '/')
    state.value = null
    globalThis.dispatchEvent(new Event('shotcaller:navigate'))
  }

  return {
    state,
    open,
    replace,
    close,
  }
}
