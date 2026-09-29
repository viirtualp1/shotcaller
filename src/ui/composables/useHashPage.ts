import { useEventListener } from '@vueuse/core'
import { shallowRef } from 'vue'

/**
 * A page that lives in the URL hash, like `#/patches/3.0`: it can be linked to and the back button closes it.
 * `parse` reads the page's state from a hash and returns `null` when the hash belongs to something else.
 */
export function useHashPage<T>(parse: (hash: string) => T | null, format: (state: T) => string) {
  const read = () => parse(globalThis.location?.hash ?? '')
  const state = shallowRef<T | null>(read())

  useEventListener(globalThis, 'hashchange', () => {
    state.value = read()
  })

  function open(next: T) {
    globalThis.location.hash = format(next)
  }

  function replace(next: T) {
    globalThis.history.replaceState(null, '', format(next))
    state.value = next
  }

  /** Goes to the main page the way a link does: a new history entry, so the back button comes here again. */
  function close() {
    if (state.value === null) {
      return
    }

    globalThis.history.pushState(null, '', globalThis.location.pathname + globalThis.location.search)
    state.value = null
  }

  return {
    state,
    open,
    replace,
    close,
  }
}
