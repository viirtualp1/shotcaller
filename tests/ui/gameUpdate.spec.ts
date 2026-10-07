import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameUpdateStore } from '@/ui/stores/gameUpdate'

const match = reactive({ isDuel: false })
vi.mock('@/ui/stores/match', () => ({ useMatchStore: () => match }))

let pinia: Pinia
const reload = vi.fn()
const fetch = vi.fn()

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  match.isDuel = false
  vi.stubGlobal('fetch', fetch)
  vi.stubGlobal('window', { location: { reload } })
  vi.stubGlobal('navigator', { serviceWorker: { controller: {} } })

  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ version: '999.0.0' }),
  })
})

afterEach(() => {
  disposePinia(pinia)
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('game update availability', () => {
  it('compares published and installed versions, including rollbacks', async () => {
    const updates = useGameUpdateStore()
    expect(updates.outdated).toBe(false)
    await updates.checkLatest()
    expect(updates.outdated).toBe(true)

    for (const version of [updates.currentVersion, '1.0.0']) {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version }),
      })

      await updates.checkLatest()
      expect(updates.outdated).toBe(false)
    }
  })

  it('keeps known update availability after a failed check', async () => {
    const updates = useGameUpdateStore()
    await updates.checkLatest()
    fetch.mockRejectedValueOnce(new TypeError('Offline'))
    await updates.checkLatest()
    expect(updates.latestVersion).toBe('999.0.0')
    expect(updates.outdated).toBe(true)
    expect(updates.checking).toBe(false)
  })

  it('shares concurrent checks and cancels a hung request', async () => {
    vi.useFakeTimers()

    fetch.mockImplementationOnce(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal!.addEventListener('abort', () => reject(new Error('Aborted')))
        }),
    )

    const updates = useGameUpdateStore()
    const first = updates.checkLatest()
    const second = updates.checkLatest()
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10_000)
    await Promise.all([first, second])
    expect(updates.checking).toBe(false)
    expect(updates.latestVersion).toBeNull()
  })

  it('does not reload a controlled page when no new worker is available', async () => {
    const updates = useGameUpdateStore()
    const update = vi.fn().mockResolvedValue(undefined)
    updates.registration = { update } as unknown as ServiceWorkerRegistration
    await updates.updateGame()
    expect(update).toHaveBeenCalledTimes(1)
    expect(updates.notReady).toBe(true)
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads a regular web page without a service worker', async () => {
    const updates = useGameUpdateStore()
    await updates.updateGame()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('defers reloads during duels, including a duel started while checking', async () => {
    const updates = useGameUpdateStore()
    match.isDuel = true
    await updates.updateGame()
    expect(fetch).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()

    match.isDuel = false

    fetch.mockImplementationOnce(async () => {
      match.isDuel = true

      return {
        ok: true,
        json: async () => ({ version: '999.0.0' }),
      }
    })

    await updates.updateGame()
    expect(reload).not.toHaveBeenCalled()
  })
})
