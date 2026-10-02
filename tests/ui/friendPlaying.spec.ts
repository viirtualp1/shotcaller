import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import type { FriendEntry, FriendsService, PresenceStatus } from '@/application/social/friends'
import { useFriendsStore } from '@/ui/stores/friends'

let onPresence!: (online: ReadonlyMap<string, PresenceStatus>) => void

const notifications = {
  clear: vi.fn(),
  push: vi.fn(),
  dismissKey: vi.fn(),
}

const cloud = reactive({
  signedIn: true,
  account: { id: 'owner' },
  connect: vi.fn(),
})

vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/stores/notifications', () => ({ useNotificationsStore: () => notifications }))

vi.mock('@/ui/stores/match', () => ({
  useMatchStore: () =>
    reactive({
      view: null,
      phase: 'planning',
      isDuel: false,
      liveMatchId: vi.fn(() => null),
      liveMatch: vi.fn(() => null),
    }),
}))

vi.mock('@/ui/stores/replay', () => ({
  useReplayStore: () => ({
    liveFriend: null,
    close: vi.fn(),
  }),
}))

vi.mock('@/ui/composables/useAccountPhoto', () => ({ useAccountPhoto: () => ({ shown: ref(null) }) }))
vi.mock('@vueuse/core', () => ({ useIntervalFn: vi.fn() }))

const friend = (id: string): FriendEntry => ({
  id,
  name: id,
  avatar: null,
  photo: null,
  rating: 0,
  status: 'friend',
  since: '2026-10-01T00:00:00.000Z',
})

const playing = (activity: PresenceStatus['activity']): PresenceStatus => ({
  activity,
  round: activity === 'menu' ? null : 3,
})

async function ready() {
  const store = useFriendsStore()
  for (let i = 0; i < 12; i++) {
    await Promise.resolve()
  }

  return store
}

describe('friends starting a match', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    const service = {
      card: vi.fn(async () => null),
      list: vi.fn(async () => [friend('ana'), friend('bo')]),
      blocked: vi.fn(async () => []),
      setPhoto: vi.fn(async () => undefined),
      watch: vi.fn(() => vi.fn()),
      presence: vi.fn(() => ({
        onChange: (listener: typeof onPresence) => {
          onPresence = listener
        },
        update: vi.fn(),
        leave: vi.fn(),
      })),
    } as unknown as FriendsService

    cloud.connect.mockResolvedValue({ friends: () => service })
  })

  afterEach(() => disposePinia(getActivePinia()!))

  it('announces a friend who starts playing, not one already playing at sign-in, and clears it after', async () => {
    const friends = await ready()

    onPresence(new Map([['ana', playing('match')]]))
    expect(notifications.push).not.toHaveBeenCalled()
    expect(friends.isPlaying('ana')).toBe(true)

    onPresence(
      new Map([
        ['ana', playing('match')],
        ['bo', playing('duel')],
      ]),
    )

    expect(notifications.push).toHaveBeenCalledTimes(1)

    expect(notifications.push).toHaveBeenCalledWith(
      {
        kind: 'friendPlaying',
        coach: expect.objectContaining({ id: 'bo' }),
        duel: true,
      },
      'friendPlaying:bo',
    )

    onPresence(
      new Map([
        ['ana', playing('match')],
        ['bo', playing('menu')],
      ]),
    )

    expect(friends.isPlaying('bo')).toBe(false)
    expect(notifications.dismissKey).toHaveBeenCalledWith('friendPlaying:bo')
  })
})
