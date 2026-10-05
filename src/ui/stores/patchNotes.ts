import { defineStore } from 'pinia'
import { computed } from 'vue'
import { IN_DESKTOP } from '@/application/desktop'
import { IN_DISCORD } from '@/application/discord'
import { usePage } from '../composables/usePage'
import { patchPath } from '../seo'
import { findPatch, isNewerVersion, LATEST_PATCH } from '../patchNotes/notes'

const PATH = /^\/patches(?:\/([\w.]+))?\/?$/

/**
 * The version named in a path like `/patches/3.0`.
 * A newer version this client has not loaded yet is kept, so the address is not rewritten to an older patch.
 * Any other unknown version opens the latest one this client has.
 */
export function versionFromPath(path: string) {
  const match = PATH.exec(path)
  if (!match) {
    return null
  }

  const named = match[1]
  const known = findPatch(named)
  if (!named || known) {
    return known?.version ?? LATEST_PATCH.version
  }

  if (isNewerVersion(named, LATEST_PATCH.version)) {
    return named
  }

  return LATEST_PATCH.version
}

/** An installed PWA can still be serving the previous build when a link to a newer patch is opened. */
function installedAppCanUpdate() {
  if (IN_DISCORD || IN_DESKTOP) {
    return false
  }

  return globalThis.navigator?.serviceWorker?.controller != null
}

export const usePatchNotesStore = defineStore('patchNotes', () => {
  const page = usePage(versionFromPath, patchPath)

  const patch = computed(() => (page.state.value === null ? null : (findPatch(page.state.value) ?? null)))

  const awaitingUpdate = computed(
    () => page.state.value !== null && findPatch(page.state.value) === undefined,
  )

  function releaseUnknown() {
    if (awaitingUpdate.value) {
      page.replace(LATEST_PATCH.version)
    }
  }

  if (awaitingUpdate.value && !installedAppCanUpdate()) {
    releaseUnknown()
  }

  return {
    patch,
    awaitingUpdate,
    releaseUnknown,
    open: (version: string = LATEST_PATCH.version) => page.open(version),
    select: page.replace,
    close: page.close,
  }
})
