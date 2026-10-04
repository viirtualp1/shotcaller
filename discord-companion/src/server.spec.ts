import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import WebSocket from 'ws'
import type { DiscordBridge } from './bridge.ts'
import type { PresencePayload } from './protocol.ts'
import { PRESENCE_HOST } from './protocol.ts'
import { startPresenceServer } from './server.ts'

function bridge(): DiscordBridge & { shown: Array<PresencePayload | null> } {
  const shown: Array<PresencePayload | null> = []

  return {
    shown,
    async set(presence) {
      shown.push(presence)
    },
    async clear() {
      shown.push(null)
    },
    listen(onStatus) {
      onStatus(false)

      return () => undefined
    },
  }
}

function connect(port: number, origin: string) {
  return new WebSocket(`ws://${PRESENCE_HOST}:${port}`, { headers: { origin } })
}

async function message(socket: WebSocket) {
  const [data] = await once(socket, 'message')

  return JSON.parse(String(data)) as { type: string; message?: string }
}

test('serves only loopback and refuses a foreign origin', async () => {
  const server = await startPresenceServer(bridge(), { port: 0 })

  try {
    assert.equal(server.host, PRESENCE_HOST)
    const socket = connect(server.port, 'https://evil.example')
    await once(socket, 'error')
  } finally {
    await server.close()
  }
})

test('keeps presence until the last session is gone', async () => {
  const discord = bridge()
  const server = await startPresenceServer(discord, { port: 0, staleMs: 5_000, sweepMs: 50 })
  const origin = 'https://theshotcaller.online'

  try {
    const first = connect(server.port, origin)
    const second = connect(server.port, origin)
    const firstReady = message(first)
    const secondReady = message(second)
    await Promise.all([once(first, 'open'), once(second, 'open')])
    assert.equal((await firstReady).type, 'ready')
    assert.equal((await secondReady).type, 'ready')

    const invalid = message(first)
    first.send(JSON.stringify({ type: 'nope' }))
    assert.equal((await invalid).type, 'error')
    const pong = message(first)
    first.send(JSON.stringify({ type: 'ping' }))
    assert.equal((await pong).type, 'pong')

    first.send(JSON.stringify({ type: 'set-presence', payload: { details: 'Playing', state: 'In game' } }))
    second.send(JSON.stringify({ type: 'set-presence', payload: { details: 'Duel', state: 'Round 2' } }))
    await waitFor(() => discord.shown.length >= 2)
    assert.equal(discord.shown.at(-1)?.details, 'Duel')

    first.close()
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(discord.shown.at(-1)?.details, 'Duel')

    second.send(JSON.stringify({ type: 'clear-presence' }))
    await waitFor(() => discord.shown.at(-1) === null)
  } finally {
    await server.close()
  }
})

test('clears presence after the heartbeat goes quiet', async () => {
  const discord = bridge()
  const server = await startPresenceServer(discord, { port: 0, staleMs: 200, sweepMs: 30 })

  try {
    const socket = connect(server.port, 'http://localhost:5173')
    const ready = message(socket)
    await once(socket, 'open')
    assert.equal((await ready).type, 'ready')
    socket.send(JSON.stringify({ type: 'set-presence', payload: { details: 'Playing' } }))
    await waitFor(() => discord.shown.some((item) => item?.details === 'Playing'))
    await waitFor(() => discord.shown.at(-1) === null)
  } finally {
    await server.close()
  }
})

async function waitFor(ready: () => boolean) {
  const started = Date.now()

  while (!ready()) {
    if (Date.now() - started > 1000) {
      throw new Error('timed out')
    }

    await new Promise((resolve) => setTimeout(resolve, 15))
  }
}
