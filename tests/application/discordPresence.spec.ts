import { describe, expect, it } from 'vitest'
import { createDiscordPresence } from '@/application/discordPresence/client'
import {
  isAllowedOrigin,
  retryDelay,
  visiblePresence,
  type PresencePayload,
} from '@/application/discordPresence/protocol'
import { presenceFor } from '@/application/discordPresence/status'
import { isDesktopApp } from '@/application/discordPresence/target'

const copy = {
  playing: 'Playing',
  inGame: 'In game',
  training: 'Training',
  duel: 'Duel',
  versus: 'Versus the computer',
  finished: 'Match over',
  planning: (round: number) => `Round ${round} · planning`,
  battle: (round: number) => `Round ${round} · in battle`,
  summary: (round: number) => `Round ${round} · results`,
}

class FakeSocket extends EventTarget {
  static opened: FakeSocket[] = []

  readyState = 0

  sent: string[] = []

  constructor(readonly url: string) {
    super()
    FakeSocket.opened.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
    this.dispatchEvent(new Event('close'))
  }

  succeed() {
    this.readyState = 1
    this.dispatchEvent(new Event('open'))
  }
}

function harness() {
  const tasks: { fn: () => void; ms: number; cancelled: boolean }[] = []
  let hide: () => void = () => undefined
  let show: () => void = () => undefined
  FakeSocket.opened = []

  const client = createDiscordPresence({
    enabled: true,
    url: 'ws://127.0.0.1:38471',
    WebSocket: FakeSocket as unknown as typeof WebSocket,
    schedule(fn, ms) {
      const task = {
        fn,
        ms,
        cancelled: false,
      }

      tasks.push(task)

      return () => {
        task.cancelled = true
      }
    },
    bindHide(onHide, onShow) {
      hide = onHide
      show = onShow

      return () => undefined
    },
  })

  return {
    client,
    tasks,
    hide: () => hide(),
    show: () => show(),
    due(ms: number) {
      const ready = tasks.filter((task) => task.ms === ms && !task.cancelled)

      for (const task of ready) {
        task.cancelled = true
        task.fn()
      }
    },
  }
}

describe('Discord presence protocol', () => {
  it('allows the game and the local dev server, and refuses everyone else', () => {
    expect(isAllowedOrigin('https://theshotcaller.online')).toBe(true)
    expect(isAllowedOrigin('https://www.theshotcaller.online')).toBe(true)
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true)
    expect(isAllowedOrigin('http://127.0.0.1:4173')).toBe(true)
    expect(isAllowedOrigin('https://evil.example')).toBe(false)
    expect(isAllowedOrigin('https://123.discordsays.com')).toBe(false)
    expect(isAllowedOrigin(undefined)).toBe(false)
  })

  it('backs off and then stays at the cap', () => {
    expect(retryDelay(0)).toBe(1000)
    expect(retryDelay(1)).toBe(2000)
    expect(retryDelay(4)).toBe(30_000)
    expect(retryDelay(20)).toBe(30_000)
  })

  it('keeps a second window on screen when the first one closes', () => {
    const now = 1_000

    const first: PresencePayload = {
      details: 'Playing',
      state: 'In game',
    }

    const second: PresencePayload = {
      details: 'Duel',
      state: 'Round 2',
    }

    expect(
      visiblePresence(
        [
          {
            presence: first,
            seenAt: now,
          },
          {
            presence: second,
            seenAt: now + 10,
          },
        ],
        now + 10,
      )?.details,
    ).toBe('Duel')

    expect(
      visiblePresence(
        [
          {
            presence: null,
            seenAt: now,
          },
        ],
        now,
      ),
    ).toBeNull()

    expect(
      visiblePresence(
        [
          {
            presence: first,
            seenAt: now - 35_000,
          },
        ],
        now,
      ),
    ).toBeNull()
  })
})

describe('desktop app detection', () => {
  it('runs for an installed desktop app and skips the activity, a phone and a browser tab', () => {
    expect(
      isDesktopApp({
        inDiscord: false,
        standalone: true,
        phone: false,
      }),
    ).toBe(true)

    expect(
      isDesktopApp({
        inDiscord: true,
        standalone: true,
        phone: false,
      }),
    ).toBe(false)

    expect(
      isDesktopApp({
        inDiscord: false,
        standalone: true,
        phone: true,
      }),
    ).toBe(false)

    expect(
      isDesktopApp({
        inDiscord: false,
        standalone: false,
        phone: false,
      }),
    ).toBe(false)
  })
})

describe('presence copy', () => {
  it('describes the menu and the open round', () => {
    expect(presenceFor(null, copy)).toEqual({
      details: 'Playing',
      state: 'In game',
    })

    expect(
      presenceFor(
        {
          phase: 'battle',
          round: 4,
          sandbox: false,
          duel: false,
        },
        copy,
      ),
    ).toEqual({
      details: 'Versus the computer',
      state: 'Round 4 · in battle',
    })

    expect(
      presenceFor(
        {
          phase: 'planning',
          round: 1,
          sandbox: true,
          duel: false,
        },
        copy,
      ).details,
    ).toBe('Training')

    expect(
      presenceFor(
        {
          phase: 'summary',
          round: 2,
          sandbox: false,
          duel: true,
        },
        copy,
      ),
    ).toEqual({
      details: 'Duel',
      state: 'Round 2 · results',
    })
  })
})

describe('presence client', () => {
  it('does nothing when the feature is off', () => {
    FakeSocket.opened = []

    const client = createDiscordPresence({
      enabled: false,
      WebSocket: FakeSocket as unknown as typeof WebSocket,
    })

    client.connect()
    client.setPresence({ details: 'Playing' })
    expect(FakeSocket.opened).toHaveLength(0)
  })

  it('sends one update for a burst, keeps the session clock, and retries slowly', () => {
    const { client, due, hide, show } = harness()
    client.connect()
    const socket = FakeSocket.opened[0]!
    socket.succeed()

    client.setPresence({
      details: 'Playing',
      state: 'In game',
      startTimestamp: 5,
    })

    client.setPresence({
      details: 'Duel',
      state: 'Round 2',
    })

    expect(socket.sent).toHaveLength(0)
    due(400)
    expect(socket.sent).toHaveLength(1)

    const sent = JSON.parse(socket.sent[0]!) as {
      type: string
      payload: { details: string; startTimestamp: number }
    }

    expect(sent.type).toBe('set-presence')
    expect(sent.payload.details).toBe('Duel')
    expect(sent.payload.startTimestamp).toBeGreaterThan(5)

    client.setPresence({
      details: 'Duel',
      state: 'Round 2',
    })

    due(400)
    expect(socket.sent).toHaveLength(1)

    hide()
    expect(JSON.parse(socket.sent.at(-1)!)).toMatchObject({ type: 'clear-presence' })
    show()
    expect(JSON.parse(socket.sent.at(-1)!).type).toBe('set-presence')

    socket.close()
    expect(socket.sent.length).toBeGreaterThan(1)
    due(1000)
    expect(FakeSocket.opened).toHaveLength(2)
    FakeSocket.opened[1]!.close()
    due(1000)
    expect(FakeSocket.opened).toHaveLength(2)
    due(2000)
    expect(FakeSocket.opened).toHaveLength(3)
  })
})
