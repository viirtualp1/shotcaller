import { defineStore } from 'pinia'
import { computed } from 'vue'
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

export const usePatchNotesStore = defineStore('patchNotes', () => {
  const page = usePage(versionFromPath, patchPath)

  const patch = computed(() =>
    page.state.value === null ? null : (findPatch(page.state.value) ?? LATEST_PATCH),
  )

  const awaitingUpdate = computed(
    () => page.state.value !== null && findPatch(page.state.value) === undefined,
  )

  const requestedVersion = computed(() => page.state.value)

  return {
    patch,
    awaitingUpdate,
    requestedVersion,
    open: (version: string = LATEST_PATCH.version) => page.open(version),
    select: page.replace,
    close: page.close,
  }
})
