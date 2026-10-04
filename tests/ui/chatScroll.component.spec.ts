// @vitest-environment happy-dom
import { createApp, nextTick, reactive, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FriendEntry } from '@/application/social/friends'
import ChatPanel from '@/ui/components/social/ChatPanel.vue'
import { i18n } from '@/ui/i18n'

const FRIEND = 'friend-1'

interface Message {
  id: string
  sender: string
  body: string
  createdAt: string
}

const chat = reactive({
  friendId: FRIEND,
  messages: [] as Message[],
  drafts: {} as Record<string, string>,
  atEnd: true,
  sending: false,
  loading: false,
  hasOlder: false,
  failure: null,
  send: vi.fn(),
  loadOlder: vi.fn(),
  open: vi.fn(),
})

vi.mock('@/ui/stores/chat', () => ({ useChatStore: () => chat }))

vi.mock('@/ui/stores/friends', () => ({
  useFriendsStore: () =>
    reactive({
      isOnline: () => true,
      isPlaying: () => false,
      statusOf: () => null,
      openProfile: vi.fn(),
    }),
}))

vi.mock('@/ui/stores/duel', () => ({
  useDuelStore: () =>
    reactive({
      busy: false,
      challenge: vi.fn(),
    }),
}))

vi.mock('@/ui/stores/settings', () => ({ useSettingsStore: () => reactive({ locale: 'en' }) }))

const friend = {
  id: FRIEND,
  name: 'Friend',
  avatar: null,
} as unknown as FriendEntry

let app: App
let message = 0

/** The list has no layout here: its scroll box is described by hand, 400 tall over 2000 of content. */
function list() {
  const el = document.querySelector<HTMLElement>('.messages')!
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    value: 2000,
  })

  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    value: 400,
  })

  el.scrollTo = ((options: ScrollToOptions) => {
    el.scrollTop = options.top ?? 0
  }) as typeof el.scrollTo

  return el
}

async function settle() {
  for (let i = 0; i < 4; i++) {
    await nextTick()
  }

  await new Promise((resolve) => requestAnimationFrame(resolve))
}

function arrive(sender: string) {
  message++

  chat.messages = [
    ...chat.messages,
    {
      id: `m${message}`,
      sender,
      body: `message ${message}`,
      createdAt: new Date(2026, 9, 4, 12, message).toISOString(),
    },
  ]
}

/* The conversation loads after the panel opens, as it does in the game. */
beforeEach(async () => {
  chat.messages = []

  app = createApp(ChatPanel, {
    friend,
    active: true,
  }).use(i18n)

  app.mount(document.body.appendChild(document.createElement('div')))
  arrive(FRIEND)
  await settle()
})

afterEach(() => {
  app.unmount()
  document.body.innerHTML = ''
})

describe('chat scrolling on a phone', () => {
  it('stays at the newest message when the keyboard or layout moves the list', async () => {
    const el = list()
    el.scrollTop = 1600
    el.dispatchEvent(new Event('scroll'))

    /* The keyboard shrinks the window: the list scrolls without the reader touching it. */
    el.scrollTop = 1300
    el.dispatchEvent(new Event('scroll'))

    arrive(FRIEND)
    await settle()

    expect(el.scrollTop).toBe(2000)
    expect(document.querySelector('.catch-up')).toBeNull()
  })

  it('lets the reader scroll up to read history, and keeps their place for new messages', async () => {
    const el = list()
    el.dispatchEvent(new Event('touchmove'))
    el.scrollTop = 200
    el.dispatchEvent(new Event('scroll'))

    arrive(FRIEND)
    await settle()

    expect(el.scrollTop).toBe(200)
    expect(document.querySelector('.catch-up')).not.toBeNull()
  })

  it('always brings the reader’s own message into view', async () => {
    const el = list()
    el.dispatchEvent(new Event('touchmove'))
    el.scrollTop = 200
    el.dispatchEvent(new Event('scroll'))

    arrive('me')
    await settle()

    expect(el.scrollTop).toBe(2000)
    expect(document.querySelector('.catch-up')).toBeNull()
  })

  it('keeps the field focused when the send button is pressed, so the keyboard stays open', async () => {
    chat.send.mockImplementation(async () => {
      arrive('me')

      return true
    })

    const field = document.querySelector<HTMLTextAreaElement>('textarea')!
    const send = document.querySelector<HTMLButtonElement>('button.send')!
    field.focus()
    field.value = 'hello'
    field.dispatchEvent(new Event('input'))
    await settle()

    const press = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
    })

    send.dispatchEvent(press)
    expect(press.defaultPrevented).toBe(true)

    send.click()
    await settle()

    expect(chat.send).toHaveBeenCalledWith('hello')
    expect(document.activeElement).toBe(field)
  })
})
