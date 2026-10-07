// @vitest-environment happy-dom
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePatchNotesStore } from '@/ui/stores/patchNotes'
import { LATEST_PATCH } from '@/ui/patchNotes/notes'

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('patch links on an older client', () => {
  it.each([undefined, { controller: null }, { controller: {} }])(
    'opens the installed patch with a warning while preserving the requested version: %j',
    (serviceWorker) => {
      vi.stubGlobal('navigator', { serviceWorker })
      window.history.replaceState(null, '', '/patches/999.0/?from=link')
      const pinia = createPinia()
      setActivePinia(pinia)
      const notes = usePatchNotesStore()

      expect(notes.patch).toBe(LATEST_PATCH)
      expect(notes.awaitingUpdate).toBe(true)
      expect(notes.requestedVersion).toBe('999.0')
      expect(window.location.pathname).toBe('/patches/999.0')
      expect(window.location.search).toBe('?from=link')

      // Choosing an available patch removes the warning.
      notes.select(LATEST_PATCH.version)
      expect(notes.patch).toBe(LATEST_PATCH)
      expect(notes.awaitingUpdate).toBe(false)
      disposePinia(pinia)
    },
  )
})
