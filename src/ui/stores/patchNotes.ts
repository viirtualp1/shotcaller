import { useEventListener, useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import { findPatch, LATEST_PATCH } from '../patchNotes/notes'

const HASH = /^#\/patches(?:\/([\w.]+))?\/?$/

/** The version named in the URL hash, like `#/patches/3.0`; `null` when the page is closed. */
function versionFromHash() {
  const match = HASH.exec(globalThis.location?.hash ?? '')
  if (!match) {
    return null
  }

  return findPatch(match[1])?.version ?? LATEST_PATCH.version
}

const hashFor = (version: string) => `#/patches/${version}`

/** The patch notes page lives in the URL hash, so it can be linked to and the back button closes it. */
export const usePatchNotesStore = defineStore('patchNotes', () => {
  const version = ref(versionFromHash())
  const seen = useLocalStorage(STORAGE_KEYS.patchNotesSeen, '')
  /** Set when the page was opened from inside the game, so closing it can step back in history. */
  let pushed = false

  const patch = computed(() => (version.value === null ? null : (findPatch(version.value) ?? LATEST_PATCH)))
  const unseen = computed(() => seen.value !== LATEST_PATCH.version)

  useEventListener(globalThis, 'hashchange', () => {
    version.value = versionFromHash()

    if (version.value === null) {
      pushed = false
    }
  })

  watch(
    version,
    (open) => {
      if (open !== null) {
        seen.value = LATEST_PATCH.version
      }
    },
    { immediate: true },
  )

  function open(target: string = LATEST_PATCH.version) {
    pushed = true
    globalThis.location.hash = hashFor(target)
  }

  function select(target: string) {
    globalThis.history.replaceState(null, '', hashFor(target))
    version.value = target
  }

  function close() {
    if (pushed) {
      globalThis.history.back()

      return
    }

    globalThis.history.replaceState(null, '', globalThis.location.pathname + globalThis.location.search)
    version.value = null
  }

  return {
    patch,
    unseen,
    open,
    select,
    close,
  }
})
