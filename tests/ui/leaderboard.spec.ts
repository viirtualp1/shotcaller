import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { nextTick, reactive, shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModeId } from '@/content/ids'
import type { LeaderboardEntry } from '@/application/social/leaderboard'
import { useLeaderboardStore } from '@/ui/stores/leaderboard'

const page = {
  state: shallowRef<ModeId | null>(null),
  open: vi.fn(),
  replace: vi.fn(),
  close: vi.fn(),
}

const cloud = reactive({
  enabled: true,
  signedIn: false,
  account: null as { id: string } | null,
  connect: vi.fn(),
})

const read = vi.fn<(mode: ModeId) => Promise<LeaderboardEntry[]>>()

vi.mock('@/ui/composables/usePage', () => ({ usePage: () => page }))
vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/stores/settings', () => ({ useSettingsStore: () => ({ mode: 'threeLanes' }) }))

const row: LeaderboardEntry = {
  id: 'coach',
  position: 1,
  name: 'Alpha',
  avatar: null,
  photo: null,
  rating: 1200,
  open: true,
}

async function flush() {
  await nextTick()

  for (let i = 0; i < 8; i++) {
    await Promise.resolve()
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  page.state.value = null
  cloud.enabled = true
  cloud.signedIn = false
  cloud.account = null
  read.mockResolvedValue([row])
  cloud.connect.mockResolvedValue({ leaderboard: () => ({ read }) })
})

afterEach(() => disposePinia(getActivePinia()!))

describe('leaderboard loading', () => {
  it('does not query in the background and lets guests browse when the page opens', async () => {
    const store = useLeaderboardStore()
    await flush()
    expect(cloud.connect).not.toHaveBeenCalled()
    page.state.value = 'oneLane'
    await flush()
    expect(read).toHaveBeenCalledWith('oneLane')
    expect(store.rows).toEqual([row])
  })

  it('drops a delayed result from the previous mode', async () => {
    let finish!: (rows: LeaderboardEntry[]) => void
    read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )

    page.state.value = 'oneLane'
    const store = useLeaderboardStore()
    await flush()
    page.state.value = 'twoLanes'
    await flush()

    finish([
      {
        ...row,
        rating: 9999,
      },
    ])

    await flush()
    expect(store.rows).toEqual([row])
    expect(store.mode).toBe('twoLanes')
  })

  it('discards account-specific rows after signing out and reloads the public ladder', async () => {
    let finish!: (rows: LeaderboardEntry[]) => void
    read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )

    cloud.account = { id: 'signed-in' }
    cloud.signedIn = true
    page.state.value = 'threeLanes'
    const store = useLeaderboardStore()
    await flush()
    cloud.account = null
    cloud.signedIn = false
    await flush()

    finish([
      {
        ...row,
        name: 'Old account result',
      },
    ])

    await flush()
    expect(store.rows).toEqual([row])
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('clears a closed page and retries after a network failure', async () => {
    read.mockRejectedValueOnce(new Error('offline'))
    page.state.value = 'threeLanes'
    const store = useLeaderboardStore()
    await flush()
    expect(store.error).toBe(true)
    expect(store.loading).toBe(false)
    await store.refresh()
    expect(store.error).toBe(false)
    expect(store.rows).toEqual([row])
    page.state.value = null
    await flush()
    expect(store.rows).toEqual([])
  })
})
