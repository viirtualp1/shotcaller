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
    'preserves the future version regardless of worker availability: %j',
    (serviceWorker) => {
      vi.stubGlobal('navigator', { serviceWorker })
      window.history.replaceState(null, '', '/patches/999.0/?from=link')
      const pinia = createPinia()
      setActivePinia(pinia)
      const notes = usePatchNotesStore()

      expect(notes.patch).toBeNull()
      expect(notes.awaitingUpdate).toBe(true)
      expect(notes.requestedVersion).toBe('999.0')
      expect(window.location.pathname).toBe('/patches/999.0')
      expect(window.location.search).toBe('?from=link')

      // Only an explicit player choice opens the installed patch.
      notes.select(LATEST_PATCH.version)
      expect(notes.patch).toBe(LATEST_PATCH)
      expect(notes.awaitingUpdate).toBe(false)
      disposePinia(pinia)
    },
  )
})
