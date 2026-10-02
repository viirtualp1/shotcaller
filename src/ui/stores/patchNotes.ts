import { defineStore } from 'pinia'
import { computed } from 'vue'
import { usePage } from '../composables/usePage'
import { patchPath } from '../seo'
import { findPatch, LATEST_PATCH } from '../patchNotes/notes'

const PATH = /^\/patches(?:\/([\w.]+))?\/?$/

/** The version named in a path like `/patches/3.0/`; an unknown version opens the latest patch. */
function versionFromPath(path: string) {
  const match = PATH.exec(path)
  if (!match) {
    return null
  }

  return findPatch(match[1])?.version ?? LATEST_PATCH.version
}

export const usePatchNotesStore = defineStore('patchNotes', () => {
  const page = usePage(versionFromPath, patchPath)

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
