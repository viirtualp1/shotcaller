import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const SOURCE = readFileSync(new URL('../../public/notification-click.js', import.meta.url), 'utf8')
const ORIGIN = 'https://theshotcaller.online'

type Listener = (event: unknown) => void

/** Runs the worker script in a fake service worker scope and taps a notification carrying `data`. */
async function tap(data: unknown, windows: { url: string }[]) {
  const listeners = new Map<string, Listener>()

  const clients = windows.map((window) => ({
    ...window,
    focus: vi.fn().mockResolvedValue(undefined),
    postMessage: vi.fn(),
  }))

  const opened = {
    url: `${ORIGIN}/`,
    focus: vi.fn(),
    postMessage: vi.fn(),
  }

  const scope = {
    location: new URL(ORIGIN),
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    clients: {
      matchAll: vi.fn().mockResolvedValue(clients),
      openWindow: vi.fn().mockResolvedValue(opened),
    },
  }

  runInNewContext(SOURCE, {
    self: scope,
    URL,
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

  await work

  return {
    notification,
    clients,
    opened,
    openWindow: scope.clients.openWindow,
  }
}

describe('tapping a notification on a phone', () => {
  it('brings the open game forward and tells it what to open', async () => {
    const target = {
      kind: 'chat',
      friendId: 'friend-1',
    }

    const { notification, clients, openWindow } = await tap(target, [{ url: `${ORIGIN}/patches/9.0/` }])

    expect(notification.close).toHaveBeenCalled()
    expect(clients[0]!.focus).toHaveBeenCalled()

    expect(clients[0]!.postMessage).toHaveBeenCalledWith({
      type: 'notification-click',
      target,
    })

    expect(openWindow).not.toHaveBeenCalled()
  })

  it('opens the game when it is closed, and still says what the tap was about', async () => {
    const { opened, openWindow } = await tap({ kind: 'friends' }, [{ url: 'https://elsewhere.example/' }])

    expect(openWindow).toHaveBeenCalledWith('/')

    expect(opened.postMessage).toHaveBeenCalledWith({
      type: 'notification-click',
      target: { kind: 'friends' },
    })
  })

  it('opens the game itself for a notification without a target', async () => {
    const { opened } = await tap(undefined, [])

    expect(opened.postMessage).toHaveBeenCalledWith({
      type: 'notification-click',
      target: { kind: 'game' },
    })
  })
})
