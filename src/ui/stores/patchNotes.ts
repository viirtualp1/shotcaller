import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useHashPage } from '../composables/useHashPage'
import { findPatch, LATEST_PATCH } from '../patchNotes/notes'

const HASH = /^#\/patches(?:\/([\w.]+))?\/?$/

/** The version named in a hash like `#/patches/3.0`; an unknown version opens the latest patch. */
function versionFromHash(hash: string) {
  const match = HASH.exec(hash)
  if (!match) {
    return null
  }

  return findPatch(match[1])?.version ?? LATEST_PATCH.version
}

export const usePatchNotesStore = defineStore('patchNotes', () => {
  const page = useHashPage(versionFromHash, (version) => `#/patches/${version}`)

  const patch = computed(() =>
    page.state.value === null ? null : (findPatch(page.state.value) ?? LATEST_PATCH),
  )

  return {
    patch,
    open: (version: string = LATEST_PATCH.version) => page.open(version),
    select: page.replace,
    close: page.close,
  }
})
