import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { nextTick, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage, ChatService } from '@/application/social/chat'
import { useChatStore } from '@/ui/stores/chat'
import { useModalsStore } from '@/ui/stores/modals'

const visibility = ref('visible')

const cloud = reactive({
  signedIn: false,
  account: { id: 'me' },
  connect: vi.fn(),
})

const friends = reactive({
  friends: [{ id: 'anna' }, { id: 'bob' }],
  open: false,
  refresh: vi.fn(),
})

vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/stores/friends', () => ({ useFriendsStore: () => friends }))

vi.mock('@vueuse/core', async (original) => ({
  ...(await original<typeof import('@vueuse/core')>()),
  useDocumentVisibility: () => visibility,
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void

  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })

  return {
    promise,
    resolve,
    reject,
  }
}

const message = (id: number, sender = 'anna'): ChatMessage => ({
  id,
  sender,
  recipient: 'me',
  body: `Message ${id}`,
  createdAt: '2026-10-01T00:00:00Z',
  readAt: null,
})

let receive: (message: ChatMessage) => void
let service: ChatService

async function connected() {
  const chat = useChatStore()
  await nextTick()
  await Promise.resolve()

  return chat
}

describe('chat interactions', () => {
  afterEach(() => {
    disposePinia(getActivePinia()!)
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    visibility.value = 'visible'
    friends.open = false
    cloud.signedIn = true

    service = {
      conversation: vi.fn(async () => []),
      send: vi.fn(async () => message(99, 'me')),
      markRead: vi.fn(async () => undefined),
      unread: vi.fn(async () => new Map()),
      watch: vi.fn((callback) => {
        receive = callback

        return () => undefined
      }),
    }

    cloud.connect.mockResolvedValue({ chat: () => service })
  })

  it('preserves the conversation and draft when minimized or covered by a dialog', async () => {
    const chat = await connected()
    await chat.open('anna')
    chat.drafts.anna = 'See you after the match'
    chat.minimize()
    expect(chat.windowOpen).toBe(false)
    expect(chat.friendId).toBe('anna')
    chat.toggleWindow()
    expect(chat.windowOpen).toBe(true)
    const modals = useModalsStore()
    const dialog = Symbol()
    modals.open.add(dialog)
    expect(chat.windowOpen).toBe(false)
    modals.open.delete(dialog)
    expect(chat.windowOpen).toBe(true)
    expect(chat.drafts.anna).toBe('See you after the match')
    expect(service.conversation).toHaveBeenCalledTimes(1)
  })

  it('counts minimized messages as unread and acknowledges them when restored', async () => {
    const chat = await connected()
    await chat.open('anna')
    await nextTick()
    vi.mocked(service.markRead).mockClear()
    chat.minimize()
    receive(message(1))
    expect(chat.messages).toHaveLength(1)
    expect(chat.unreadFrom('anna')).toBe(1)
    expect(service.markRead).not.toHaveBeenCalled()
    chat.toggleWindow()
    await nextTick()
    expect(chat.totalUnread).toBe(0)
    expect(service.markRead).toHaveBeenCalledWith('anna')
  })

  it('keeps messages unread while reading history, behind a modal, or in a background tab', async () => {
    const chat = await connected()
    await chat.open('anna')
    chat.atEnd = false
    receive(message(1))
    expect(chat.totalUnread).toBe(1)
    chat.atEnd = true
    await nextTick()
    expect(chat.totalUnread).toBe(0)
    const modals = useModalsStore()
    modals.open.add(Symbol())
    receive(message(2))
    expect(chat.totalUnread).toBe(1)
    visibility.value = 'hidden'
    modals.open.clear()
    await nextTick()
    receive(message(3))
    expect(chat.totalUnread).toBe(2)
    visibility.value = 'visible'
    await nextTick()
    expect(chat.totalUnread).toBe(0)
  })

  it('ignores stale loads even when switching back to the same friend', async () => {
    const chat = await connected()
    const oldPage = deferred<ChatMessage[]>()
    const newPage = deferred<ChatMessage[]>()
    vi.mocked(service.conversation)
      .mockImplementationOnce(() => oldPage.promise)
      .mockResolvedValueOnce([message(2, 'bob')])
      .mockImplementationOnce(() => newPage.promise)

    const oldLoad = chat.open('anna')
    await chat.open('bob')
    const newLoad = chat.open('anna')
    oldPage.resolve([message(1)])
    await oldLoad
    expect(chat.messages).toEqual([])
    expect(chat.loading).toBe(true)
    newPage.resolve([message(3)])
    await newLoad
    expect(chat.messages.map((m) => m.id)).toEqual([3])
    expect(chat.loading).toBe(false)
  })

  it('merges messages delivered while a conversation is loading', async () => {
    const chat = await connected()
    const page = deferred<ChatMessage[]>()
    vi.mocked(service.conversation).mockReturnValueOnce(page.promise)
    const opening = chat.open('anna')
    receive(message(2))
    page.resolve([message(1), message(2)])
    await opening
    expect(chat.messages.map((m) => m.id)).toEqual([1, 2])
  })

  it('does not put a late send into a different conversation', async () => {
    const chat = await connected()
    await chat.open('anna')
    const sent = deferred<ChatMessage>()
    vi.mocked(service.send).mockReturnValueOnce(sent.promise)
    const sending = chat.send('Hi Anna')
    await chat.open('bob')

    sent.resolve({
      ...message(9, 'me'),
      recipient: 'anna',
    })

    expect(await sending).toBe(true)
    expect(chat.friendId).toBe('bob')
    expect(chat.messages).toEqual([])
  })

  it('does not leave an error or loading state from a closed request', async () => {
    const chat = await connected()
    const page = deferred<ChatMessage[]>()
    vi.mocked(service.conversation).mockReturnValueOnce(page.promise)
    const opening = chat.open('anna')
    chat.close()
    page.reject(new Error('offline'))
    await opening
    expect(chat.loading).toBe(false)
    expect(chat.failure).toBeNull()
  })

  it('loads a conversation opened before the account connection is ready', async () => {
    const connection = deferred<{ chat: () => ChatService }>()
    cloud.connect.mockReturnValueOnce(connection.promise)
    const chat = useChatStore()
    await chat.open('anna')
    expect(chat.loading).toBe(true)
    vi.mocked(service.conversation).mockResolvedValue([message(1)])
    connection.resolve({ chat: () => service })
    await nextTick()
    await Promise.resolve()
    await nextTick()
    expect(chat.messages.map((m) => m.id)).toEqual([1])
    expect(chat.loading).toBe(false)
  })

  it('can retry after the account connection fails', async () => {
    cloud.connect.mockRejectedValueOnce(new Error('offline'))
    const chat = useChatStore()
    await nextTick()
    await Promise.resolve()
    await nextTick()
    await vi.waitFor(() => expect(chat.failure).toBe('failed'))
    await chat.open('anna', true)
    await nextTick()
    await Promise.resolve()
    await nextTick()
    expect(chat.loading).toBe(false)
    expect(chat.failure).toBeNull()
    expect(service.conversation).toHaveBeenCalledWith('anna')
  })

  it('keeps realtime unread counts when the initial badge request finishes late', async () => {
    const counts = deferred<ReadonlyMap<string, number>>()
    vi.mocked(service.unread).mockReturnValueOnce(counts.promise)
    const chat = await connected()
    await chat.open('anna')
    chat.minimize()
    receive(message(1))

    counts.resolve(
      new Map([
        ['anna', 0],
        ['bob', 3],
      ]),
    )

    await nextTick()
    await Promise.resolve()
    expect(chat.unreadFrom('anna')).toBe(1)
    expect(chat.unreadFrom('bob')).toBe(3)
  })

  it('clears private drafts and conversations on sign-out', async () => {
    const chat = await connected()
    await chat.open('anna')
    chat.drafts.anna = 'Private draft'
    cloud.signedIn = false
    await nextTick()
    expect(chat.drafts).toEqual({})
    expect(chat.friendId).toBeNull()
    expect(chat.windowOpen).toBe(false)
  })
})
