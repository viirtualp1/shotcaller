// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { nextTick, reactive, ref } from 'vue'
import { useZoomHint } from '@/ui/composables/useZoomHint'
import { useProfileStore } from '@/ui/stores/profile'
import { usePauseStore } from '@/ui/stores/pause'
import { useModalsStore } from '@/ui/stores/modals'

const touch = ref(true)
const visibility = ref('visible')
const match = reactive({ isPlanning: true })
vi.mock('@/ui/stores/match', () => ({ useMatchStore: () => match }))

vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useMediaQuery: () => touch,
  useDocumentVisibility: () => visibility,
}))

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  setActivePinia(createPinia())
  touch.value = true
  visibility.value = 'visible'
  match.isPlanning = true
})

afterEach(() => {
  disposePinia(getActivePinia()!)
  vi.useRealTimers()
})

describe('one-time touch camera hint', () => {
  it('waits for the game, shows once, persists through reload, and resets for a fresh profile', async () => {
    const hint = useZoomHint()
    const profile = useProfileStore()
    await vi.advanceTimersByTimeAsync(3000)
    expect(hint.open).toBe(false)
    hint.setActive(true)
    await nextTick()
    await vi.advanceTimersByTimeAsync(2399)
    expect(hint.open).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(hint.open).toBe(true)
    expect(profile.profile.zoomHintSeen).toBe(true)
    expect(usePauseStore().paused).toBe(true)
    hint.close()
    expect(usePauseStore().paused).toBe(false)
    expect(hint.show()).toBe(false)
    disposePinia(getActivePinia()!)
    setActivePinia(createPinia())
    expect(useProfileStore().profile.zoomHintSeen).toBe(true)
    expect(useZoomHint().show()).toBe(false)
    useProfileStore().reset()
    expect(useZoomHint().show()).toBe(true)
  })

  it('does not appear on desktop, during a battle, behind another modal or after leaving the game', async () => {
    const hint = useZoomHint()
    hint.setActive(true)
    touch.value = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(3000)
    expect(hint.open).toBe(false)
    touch.value = true
    match.isPlanning = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(3000)
    expect(hint.open).toBe(false)
    match.isPlanning = true
    const modal = Symbol()
    useModalsStore().open.add(modal)
    await nextTick()
    await vi.advanceTimersByTimeAsync(3000)
    expect(hint.open).toBe(false)
    useModalsStore().open.delete(modal)
    await nextTick()
    await vi.advanceTimersByTimeAsync(1000)
    hint.setActive(false)
    await nextTick()
    await vi.advanceTimersByTimeAsync(3000)
    expect(hint.open).toBe(false)
    expect(useProfileStore().profile.zoomHintSeen).toBeUndefined()
  })
})
