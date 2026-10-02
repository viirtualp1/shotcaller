import { useEventListener } from '@vueuse/core'
import { shallowRef } from 'vue'

/** Pages used to live behind a hash (`/#/profile`); links saved back then open the same page at its path. */
function upgradeHashLink() {
  const hash = globalThis.location?.hash ?? ''
  if (hash.startsWith('#/')) {
    globalThis.history.replaceState(null, '', hash.slice(1))
  }
}

/**
 * A page of the app addressed by its path, without a trailing slash, with browser history.
 * `parse` receives the path and returns null for another page; `format` gives the path of a state.
 */
export function usePage<T>(parse: (path: string) => T | null, format: (state: T) => string) {
  /** Older spellings (a trailing slash, a camelCase mode) open the page and show its current address. */
  const read = () => {
    upgradeHashLink()

    const path = globalThis.location?.pathname ?? '/'
    const page = parse(path)
    if (page !== null && format(page) !== path) {
      const { search, hash } = globalThis.location
      globalThis.history.replaceState(null, '', `${format(page)}${search}${hash}`)
    }

    return page
  }

  const state = shallowRef<T | null>(read())

  useEventListener(globalThis, ['hashchange', 'popstate', 'shotcaller:navigate'], () => {
    state.value = read()
  })

  function navigate(url: string) {
    globalThis.history.pushState(null, '', url)
    globalThis.dispatchEvent(new Event('shotcaller:navigate'))
  }

  function open(next: T) {
    navigate(format(next))
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

    state.value = null
    navigate('/')
  }

  return {
    state,
    open,
    replace,
    close,
  }
}
