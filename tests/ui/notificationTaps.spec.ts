import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { useSystemNotificationsStore } from '@/ui/stores/systemNotifications'

const chat = { open: vi.fn() }
const friends = reactive({ open: false })
const cloud = reactive({ signedIn: false })

vi.mock('@/ui/stores/chat', () => ({ useChatStore: () => chat }))
vi.mock('@/ui/stores/friends', () => ({ useFriendsStore: () => friends }))
vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/stores/duel', () => ({ useDuelStore: () => reactive({ incoming: null }) }))
vi.mock('@/ui/stores/notifications', () => ({ useNotificationsStore: () => reactive({ items: [] }) }))
vi.mock('@/ui/composables/useGameText', () => ({ useGameText: () => ({ t: (key: string) => key }) }))
vi.mock('@/ui/composables/useNotificationText', () => ({ useNotificationText: () => ({}) }))

/** The page's side of the service worker: it hears what a tap on a notification was about. */
class Worker extends EventTarget {
  startMessages = vi.fn()

  tap(target: unknown, ports: MessagePort[] = []) {
    this.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'notification-click',
          target,
        },
        ports,
      }),
    )
  }
}

let worker: Worker
const channels: MessageChannel[] = []

function messagePort() {
  const channel = new MessageChannel()
  channels.push(channel)
  vi.spyOn(channel.port1, 'postMessage')

  return channel.port1
}

beforeEach(() => {
  worker = new Worker()
  vi.stubGlobal('navigator', { serviceWorker: worker })
  setActivePinia(createPinia())
  chat.open.mockClear()
  friends.open = false
  cloud.signedIn = false
})

afterEach(() => {
  disposePinia(getActivePinia()!)
  vi.unstubAllGlobals()

  for (const channel of channels.splice(0)) {
    channel.port1.close()
    channel.port2.close()
  }
})

describe('a tap on a notification on a phone', () => {
  it('opens the chat it was about once the account is signed back in', async () => {
    useSystemNotificationsStore()
    expect(worker.startMessages).toHaveBeenCalled()

    worker.tap({
      kind: 'chat',
      friendId: 'friend-1',
    })

    await nextTick()
    expect(chat.open).not.toHaveBeenCalled()

    cloud.signedIn = true
    await vi.waitFor(() => expect(chat.open).toHaveBeenCalledWith('friend-1'))
  })

  it('opens the friends list for a friend request', async () => {
    useSystemNotificationsStore()
    worker.tap({ kind: 'friends' })
    await nextTick()

    expect(friends.open).toBe(true)
  })

  it('acknowledges a valid tap before waiting for sign-in', async () => {
    useSystemNotificationsStore()
    const port = messagePort()
    worker.tap(
      {
        kind: 'chat',
        friendId: 'friend-1',
      },
      [port],
    )

    expect(port.postMessage).toHaveBeenCalledWith('notification-click-received')
    expect(chat.open).not.toHaveBeenCalled()

    cloud.signedIn = true
    await vi.waitFor(() => expect(chat.open).toHaveBeenCalledWith('friend-1'))
  })

  it('consumes a cold-launch chat target and preserves unrelated URL state', async () => {
    vi.stubGlobal('location', {
      href: 'https://theshotcaller.online/?notification=chat&notificationFriend=friend-1&source=pwa#sign-in',
    })

    const history = {
      state: { retained: true },
      replaceState: vi.fn(),
    }

    vi.stubGlobal('history', history)
    useSystemNotificationsStore()

    expect(history.replaceState).toHaveBeenCalledWith(
      history.state,
      '',
      'https://theshotcaller.online/?source=pwa#sign-in',
    )

    expect(chat.open).not.toHaveBeenCalled()
    cloud.signedIn = true
    await vi.waitFor(() => expect(chat.open).toHaveBeenCalledWith('friend-1'))
  })

  it('opens friends from the launch URL even without service worker messages', () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('location', { href: 'https://theshotcaller.online/?notification=friends' })

    vi.stubGlobal('history', {
      state: null,
      replaceState: vi.fn(),
    })

    useSystemNotificationsStore()
    expect(friends.open).toBe(true)
  })

  it('ignores messages that are not taps', async () => {
    cloud.signedIn = true
    useSystemNotificationsStore()

    worker.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'something-else',
          target: { kind: 'friends' },
        },
      }),
    )

    const port = messagePort()
    worker.tap({ kind: 'chat' }, [port])

    worker.tap(
      {
        kind: 'chat',
        friendId: '',
      },
      [port],
    )

    await nextTick()

    expect(friends.open).toBe(false)
    expect(chat.open).not.toHaveBeenCalled()
    expect(port.postMessage).not.toHaveBeenCalled()
  })
})
