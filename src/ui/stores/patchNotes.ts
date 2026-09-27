import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
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
  const seen = useLocalStorage(STORAGE_KEYS.patchNotesSeen, '')

  const patch = computed(() =>
    page.state.value === null ? null : (findPatch(page.state.value) ?? LATEST_PATCH),
  )

  const unseen = computed(() => seen.value !== LATEST_PATCH.version)

  watch(
    page.state,
    (open) => {
      if (open !== null) {
        seen.value = LATEST_PATCH.version
      }
    },
    { immediate: true },
  )

  return {
    patch,
    unseen,
    open: (version: string = LATEST_PATCH.version) => page.open(version),
    select: page.replace,
    close: page.close,
  }
})
