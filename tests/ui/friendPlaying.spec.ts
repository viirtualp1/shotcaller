import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, ref } from 'vue'
import type { FriendEntry, FriendsService, PresenceStatus } from '@/application/social/friends'
import { createProfile } from '@/domain/profile/Profile'
import { useFriendsStore } from '@/ui/stores/friends'

let onPresence!: (online: ReadonlyMap<string, PresenceStatus>) => void

const leaderboard = {
  profile: vi.fn(),
  match: vi.fn(),
}

const privateProfile = vi.fn()
const setPublicProfile = vi.fn()

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

const duel = reactive({
  active: null as { opponent: { id: string } } | null,
  outgoing: null as { opponent: { id: string } } | null,
})

vi.mock('@/ui/stores/duel', () => ({ useDuelStore: () => duel }))

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
    leaderboard.profile.mockReset()
    leaderboard.match.mockReset()
    privateProfile.mockReset()
    setPublicProfile.mockReset().mockResolvedValue(undefined)
    duel.active = null
    duel.outgoing = null

    const service = {
      card: vi.fn(async () => null),
      list: vi.fn(async () => [friend('ana'), friend('bo')]),
      blocked: vi.fn(async () => []),
      setPhoto: vi.fn(async () => undefined),
      publicProfile: vi.fn(async () => true),
      profile: privateProfile,
      setPublicProfile,
      watch: vi.fn(() => vi.fn()),
      presence: vi.fn(() => ({
        onChange: (listener: typeof onPresence) => {
          onPresence = listener
        },
        update: vi.fn(),
        leave: vi.fn(),
      })),
    } as unknown as FriendsService

    cloud.connect.mockResolvedValue({
      friends: () => service,
      leaderboard: () => leaderboard,
    })
  })

  afterEach(() => disposePinia(getActivePinia()!))

  it('keeps a public dossier open when the friends list refreshes', async () => {
    const friends = await ready()

    const dossier = {
      ...createProfile('2026-10-06T10:00:00Z'),
      id: 'ranked',
      photo: null,
    }

    leaderboard.profile.mockResolvedValue(dossier)
    await friends.openProfile('ranked')
    await friends.refresh()
    await nextTick()
    expect(friends.viewed).toEqual(dossier)
    expect(friends.viewedId).toBe('ranked')
  })

  it('distinguishes private profiles from failed public lookups and keeps the friend fallback', async () => {
    const friends = await ready()
    leaderboard.profile.mockResolvedValue(null)
    await friends.openProfile('ranked')
    expect(friends.viewProblem).toBe('hidden')
    leaderboard.profile.mockRejectedValue(new Error('offline'))
    await friends.openProfile('ranked')
    expect(friends.viewProblem).toBe('failed')
    expect(privateProfile).not.toHaveBeenCalled()
    privateProfile.mockResolvedValue(null)
    await friends.openProfile('ana')
    expect(privateProfile).toHaveBeenCalledWith('ana')
  })

  it('discards an earlier request when the same dossier is closed and reopened', async () => {
    const friends = await ready()
    let finish!: (value: null) => void
    leaderboard.profile.mockReturnValueOnce(
      new Promise<null>((resolve) => {
        finish = resolve
      }),
    )

    const first = friends.openProfile('ranked')
    await Promise.resolve()
    await Promise.resolve()
    friends.closeProfile()

    const dossier = {
      ...createProfile('2026-10-06T10:00:00Z'),
      id: 'ranked',
      photo: null,
    }

    leaderboard.profile.mockResolvedValueOnce(dossier)
    await friends.openProfile('ranked')
    finish(null)
    await first
    expect(friends.viewed).toEqual(dossier)
    expect(friends.viewProblem).toBeNull()
  })

  it('restores visibility after a failed save without undoing a newer choice', async () => {
    const friends = await ready()
    let fail!: (error: Error) => void
    setPublicProfile.mockReturnValueOnce(
      new Promise<void>((_, reject) => {
        fail = reject
      }),
    )

    const first = friends.setPublicProfile(false)
    expect(friends.publicProfile).toBe(false)
    await friends.setPublicProfile(true)
    fail(new Error('offline'))
    await first
    expect(friends.publicProfile).toBe(true)
    expect(friends.publicProfileFailed).toBe(false)

    setPublicProfile.mockRejectedValueOnce(new Error('offline'))
    await friends.setPublicProfile(false)
    expect(friends.publicProfile).toBe(true)
    expect(friends.publicProfileFailed).toBe(true)

    await friends.setPublicProfile(false)
    expect(friends.publicProfileFailed).toBe(false)
  })

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

  it('does not announce the opponent in our own duel, including before the accepted invite arrives', async () => {
    await ready()
    onPresence(new Map())
    duel.outgoing = { opponent: { id: 'bo' } }
    onPresence(new Map([['bo', playing('duel')]]))
    expect(notifications.push).not.toHaveBeenCalled()

    duel.outgoing = null
    duel.active = { opponent: { id: 'bo' } }
    await nextTick()
    expect(notifications.dismissKey).toHaveBeenCalledWith('friendPlaying:bo')
  })

  it('takes back a presence notice if our accepted duel arrives later', async () => {
    await ready()
    onPresence(new Map())
    onPresence(new Map([['bo', playing('duel')]]))
    expect(notifications.push).toHaveBeenCalledTimes(1)

    duel.active = { opponent: { id: 'bo' } }
    await nextTick()
    expect(notifications.dismissKey).toHaveBeenCalledWith('friendPlaying:bo')
  })
})
