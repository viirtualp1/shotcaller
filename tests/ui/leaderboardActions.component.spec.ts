// @vitest-environment happy-dom
import { createApp, nextTick, reactive, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FriendEntry, FriendRequestResult } from '@/application/social/friends'
import LeaderboardScreen from '@/ui/screens/LeaderboardScreen.vue'
import { i18n } from '@/ui/i18n'

const cloud = reactive({
  enabled: true,
  signedIn: true,
  account: { id: 'me' },
})

const friends = reactive({
  status: 'ready',
  friends: [] as FriendEntry[],
  incoming: [] as FriendEntry[],
  outgoing: [] as FriendEntry[],
  blocked: [] as FriendEntry[],
  addLeaderboard: vi.fn<(id: string) => Promise<FriendRequestResult | 'error'>>(),
  accept: vi.fn<(id: string) => Promise<void>>(),
})

const rows = ['me', 'friend', 'pending', 'incoming', 'new'].map((id, i) => ({
  id,
  position: i + 1,
  name: id,
  avatar: null,
  photo: null,
  rating: 1500 - i * 100,
}))

const leaderboard = reactive({
  rows,
  mode: 'threeLanes',
  loading: false,
  error: false,
  close: vi.fn(),
  select: vi.fn(),
})

vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/stores/friends', () => ({ useFriendsStore: () => friends }))
vi.mock('@/ui/stores/leaderboard', () => ({ useLeaderboardStore: () => leaderboard }))

let app: App

function entry(id: string, status: FriendEntry['status']): FriendEntry {
  return {
    id,
    name: id,
    avatar: null,
    photo: null,
    rating: 1000,
    status,
    since: '2026-10-04',
  }
}

function button(id: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('.friend-action')].find((el) =>
    el.getAttribute('aria-label')?.endsWith(`: ${id}`),
  )
}

async function settle() {
  for (let i = 0; i < 6; i++) {
    await nextTick()
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  cloud.signedIn = true
  friends.status = 'ready'
  friends.friends = [entry('friend', 'friend')]
  friends.incoming = [entry('incoming', 'incoming')]
  friends.outgoing = [entry('pending', 'outgoing')]
  friends.blocked = []
  friends.addLeaderboard.mockResolvedValue('sent')
  friends.accept.mockResolvedValue(undefined)
  app = createApp(LeaderboardScreen).use(i18n)
  app.mount(document.body.appendChild(document.createElement('div')))
})

afterEach(() => {
  app.unmount()
  document.body.innerHTML = ''
})

describe('friend requests from the leaderboard', () => {
  it('offers requests only to registered coaches, excludes self and friends, and disables pending requests', async () => {
    expect(button('me')).toBeUndefined()
    expect(button('friend')).toBeUndefined()
    expect(button('pending')?.disabled).toBe(true)
    expect(button('new')?.disabled).toBe(false)

    cloud.signedIn = false
    await settle()
    expect(document.querySelectorAll('.friend-action')).toHaveLength(0)
    expect(friends.addLeaderboard).not.toHaveBeenCalled()
  })

  it('sends by coach ID once and marks a successful request as pending', async () => {
    button('new')!.click()
    button('new')!.click()
    await settle()
    expect(friends.addLeaderboard).toHaveBeenCalledExactlyOnceWith('new')
    expect(button('new')?.disabled).toBe(true)
    expect(button('new')?.textContent).toContain('Request sent')
  })

  it('accepts an incoming request instead of sending another one', async () => {
    button('incoming')!.click()
    await settle()
    expect(friends.accept).toHaveBeenCalledExactlyOnceWith('incoming')
    expect(friends.addLeaderboard).not.toHaveBeenCalled()
    expect(button('incoming')).toBeUndefined()
  })

  it('shows a failed request and allows another attempt', async () => {
    friends.addLeaderboard.mockResolvedValueOnce('error')
    button('new')!.click()
    await settle()
    expect(document.querySelector('[role="status"]')?.textContent).toContain('That did not work. Try again')
    expect(button('new')?.disabled).toBe(false)

    button('new')!.click()
    await settle()
    expect(friends.addLeaderboard).toHaveBeenCalledTimes(2)
    expect(button('new')?.disabled).toBe(true)
  })
})
