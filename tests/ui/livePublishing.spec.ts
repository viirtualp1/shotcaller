import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import type { FriendsService } from '@/application/social/friends'
import type { MatchPhase } from '@/domain/match/Match'
import { useFriendsStore } from '@/ui/stores/friends'

let publish!: () => Promise<void>
let service: FriendsService

const cloud = reactive({
  signedIn: true,
  account: { id: 'owner' },
  connect: vi.fn(),
})

const match = reactive({
  view: null as { mode: string; round: number } | null,
  phase: 'planning' as MatchPhase,
  isDuel: false,
  liveMatchId: vi.fn(() => 'match-1'),
  liveMatch: vi.fn(() => ({ record: { id: 'match-1' } })),
})

vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/stores/match', () => ({ useMatchStore: () => match }))

vi.mock('@/ui/stores/duel', () => ({
  useDuelStore: () => ({
    active: null,
    outgoing: null,
    incoming: null,
    resumable: null,
    challenging: null,
  }),
}))

vi.mock('@/ui/stores/notifications', () => ({
  useNotificationsStore: () => ({
    clear: vi.fn(),
    push: vi.fn(),
    dismissKey: vi.fn(),
  }),
}))

vi.mock('@/ui/stores/replay', () => ({
  useReplayStore: () => ({
    liveFriend: null,
    close: vi.fn(),
  }),
}))

vi.mock('@/ui/composables/useAccountPhoto', () => ({ useAccountPhoto: () => ({ shown: ref(null) }) }))

vi.mock('@vueuse/core', () => ({
  useIntervalFn: (callback: () => Promise<void>) => {
    publish = callback
  },
}))

async function ready() {
  const friends = useFriendsStore()
  for (let i = 0; i < 12; i++) {
    await Promise.resolve()
  }

  return friends
}

async function tick() {
  await publish()

  for (let i = 0; i < 8; i++) {
    await Promise.resolve()
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  match.view = null
  match.phase = 'planning'
  match.liveMatchId.mockReturnValue('match-1')

  service = {
    card: vi.fn(async () => null),
    list: vi.fn(async () => []),
    blocked: vi.fn(async () => []),
    setPhoto: vi.fn(async () => undefined),
    watch: vi.fn(() => vi.fn()),
    presence: vi.fn(() => ({
      onChange: vi.fn(),
      update: vi.fn(),
      leave: vi.fn(),
    })),
    publishLiveMatch: vi.fn(async () => false),
    keepLiveMatch: vi.fn(async () => false),
  } as unknown as FriendsService

  cloud.connect.mockResolvedValue({ friends: () => service })
})

afterEach(() => disposePinia(getActivePinia()!))

describe('publishing a live match', () => {
  it('uses small heartbeats while unwatched and sends a fresh snapshot when a friend arrives', async () => {
    await ready()

    match.view = {
      mode: 'threeLanes',
      round: 1,
    }

    await tick()
    expect(service.publishLiveMatch).toHaveBeenCalledTimes(1)
    await tick()
    await tick()
    expect(service.keepLiveMatch).toHaveBeenCalledTimes(2)
    expect(match.liveMatch).toHaveBeenCalledTimes(1)

    service.keepLiveMatch = vi.fn(async () => true)
    service.publishLiveMatch = vi.fn(async () => true)
    await tick()
    await tick()
    expect(service.publishLiveMatch).toHaveBeenCalledTimes(2)
  })

  it('publishes round, phase and match changes even without viewers', async () => {
    await ready()

    match.view = {
      mode: 'threeLanes',
      round: 1,
    }

    await tick()
    match.phase = 'battle'
    await tick()
    match.view.round = 2
    await tick()
    match.liveMatchId.mockReturnValue('match-2')
    await tick()

    expect(service.publishLiveMatch).toHaveBeenCalledTimes(4)
  })

  it('republishes an expired live row and retries a failed heartbeat', async () => {
    await ready()

    match.view = {
      mode: 'threeLanes',
      round: 1,
    }

    await tick()
    service.keepLiveMatch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(null)
    await tick()
    expect(service.publishLiveMatch).toHaveBeenCalledTimes(1)
    await tick()
    expect(service.publishLiveMatch).toHaveBeenCalledTimes(2)
  })
})
