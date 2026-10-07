import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SOURCE = readFileSync(new URL('../../public/notification-click.js', import.meta.url), 'utf8')
const ORIGIN = 'https://theshotcaller.online'

type Listener = (event: unknown) => void

interface WindowOptions {
  readonly url: string
  readonly acknowledge?: boolean
  readonly focusFails?: boolean
  readonly navigateFails?: boolean
  readonly disappears?: boolean
}

class Port {
  onmessage: ((event: { data: unknown }) => void) | null = null
  peer: Port | null = null
  close = vi.fn()

  postMessage(data: unknown) {
    this.peer?.onmessage?.({ data })
  }
}

class Channel {
  port1 = new Port()
  port2 = new Port()

  constructor() {
    this.port1.peer = this.port2
    this.port2.peer = this.port1
  }
}

/** Executes the real worker handler, including acknowledgement and navigation failures. */
async function tap(data: unknown, windows: WindowOptions[], scopePath = '/', canOpen = true) {
  const listeners = new Map<string, Listener>()
  const navigated = { focus: vi.fn().mockResolvedValue(undefined) }

  const clients = windows.map((window) => ({
    url: window.url,
    focus: window.focusFails
      ? vi.fn().mockRejectedValue(new Error('Window suspended'))
      : vi.fn().mockResolvedValue(undefined),
    navigate: window.navigateFails
      ? vi.fn().mockRejectedValue(new Error('Window gone'))
      : vi.fn().mockResolvedValue(window.disappears ? null : navigated),
    postMessage: vi.fn((_message: unknown, ports: Port[]) => {
      if (window.acknowledge !== false) {
        ports[0]?.postMessage('notification-click-received')
      }
    }),
  }))

  const opened = { focus: vi.fn().mockResolvedValue(undefined) }

  const scope = {
    registration: { scope: ORIGIN + scopePath },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    clients: {
      matchAll: vi.fn().mockResolvedValue(clients),
      openWindow: vi.fn().mockResolvedValue(canOpen ? opened : null),
    },
  }

  runInNewContext(SOURCE, {
    self: scope,
    URL,
    MessageChannel: Channel,
    setTimeout,
    clearTimeout,
  })

  let work: Promise<unknown> = Promise.resolve()

  const notification = {
    data,
    close: vi.fn(),
  }

  listeners.get('notificationclick')!({
    notification,
    waitUntil: (promise: Promise<unknown>) => {
      work = promise
    },
  })

  await vi.runAllTimersAsync()
  await work

  return {
    notification,
    clients,
    opened,
    navigated,
    openWindow: scope.clients.openWindow,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('tapping a notification on a phone', () => {
  it('opens the target in a responsive game without reloading the match', async () => {
    const target = {
      kind: 'chat',
      friendId: 'friend-1',
    }

    const { notification, clients, openWindow } = await tap(target, [{ url: ORIGIN + '/patches/9.0/' }])

    expect(notification.close).toHaveBeenCalled()
    expect(clients[0]!.focus).toHaveBeenCalled()

    expect(clients[0]!.postMessage).toHaveBeenCalledWith(
      {
        type: 'notification-click',
        target,
      },
      [expect.any(Port)],
    )

    expect(clients[0]!.navigate).not.toHaveBeenCalled()
    expect(openWindow).not.toHaveBeenCalled()
  })

  it('carries the target in a cold launch URL without relying on a page listener', async () => {
    const { opened, openWindow } = await tap(
      {
        kind: 'chat',
        friendId: 'friend & 1',
      },
      [{ url: 'https://elsewhere.example/' }],
    )

    const url = new URL(openWindow.mock.calls[0]![0])
    expect(url.origin).toBe(ORIGIN)
    expect(url.pathname).toBe('/')
    expect(url.searchParams.get('notification')).toBe('chat')
    expect(url.searchParams.get('notificationFriend')).toBe('friend & 1')
    expect(opened.focus).toHaveBeenCalled()
  })

  it('navigates a suspended window when focusing it fails', async () => {
    const { clients, navigated, openWindow } = await tap({ kind: 'friends' }, [
      {
        url: ORIGIN + '/',
        focusFails: true,
      },
    ])

    expect(clients[0]!.navigate).toHaveBeenCalledWith(ORIGIN + '/?notification=friends')
    expect(navigated.focus).toHaveBeenCalled()
    expect(openWindow).not.toHaveBeenCalled()
  })

  it('navigates when the window never acknowledges delivery', async () => {
    const { clients, openWindow } = await tap({ kind: 'friends' }, [
      {
        url: ORIGIN + '/',
        acknowledge: false,
      },
    ])

    expect(clients[0]!.navigate).toHaveBeenCalledWith(ORIGIN + '/?notification=friends')
    expect(openWindow).not.toHaveBeenCalled()
  })

  it.each([{ navigateFails: true }, { disappears: true }])(
    'opens another window if the existing client cannot navigate: %s',
    async (failure) => {
      const { openWindow } = await tap({ kind: 'friends' }, [
        {
          url: ORIGIN + '/',
          focusFails: true,
          ...failure,
        },
      ])

      expect(openWindow).toHaveBeenCalledWith(ORIGIN + '/?notification=friends')
    },
  )

  it('uses the installed app scope and ignores other apps on the same origin', async () => {
    const { clients, openWindow } = await tap({ kind: 'friends' }, [{ url: ORIGIN + '/' }], '/game/')
    expect(clients[0]!.focus).not.toHaveBeenCalled()
    expect(openWindow).toHaveBeenCalledWith(ORIGIN + '/game/?notification=friends')
  })

  it.each([
    undefined,
    { kind: 'chat' },
    {
      kind: 'chat',
      friendId: '',
    },
    { kind: 'unknown' },
  ])('opens the game for a missing or invalid target: %s', async (target) => {
    const { openWindow } = await tap(target, [])
    expect(openWindow).toHaveBeenCalledWith(ORIGIN + '/?notification=game')
  })

  it('finishes safely when the browser cannot return the opened window', async () => {
    const { opened } = await tap({ kind: 'game' }, [], '/', false)
    expect(opened.focus).not.toHaveBeenCalled()
  })
})
