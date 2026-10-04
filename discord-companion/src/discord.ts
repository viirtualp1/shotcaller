import { Client } from 'discord-rpc'
import type { DiscordBridge } from './bridge.ts'
import { retryDelay, samePresence, type PresencePayload } from './protocol.ts'

interface PresenceArt {
  readonly largeImageKey?: string
  readonly largeImageText?: string
}

const LOGIN_TIMEOUT_MS = 10_000

function delay(ms: number, isStopped: () => boolean) {
  return new Promise<void>((resolve) => {
    if (isStopped()) {
      resolve()

      return
    }

    const timer = setTimeout(() => {
      clearInterval(watch)
      resolve()
    }, ms)

    const watch = setInterval(() => {
      if (!isStopped()) {
        return
      }

      clearTimeout(timer)
      clearInterval(watch)
      resolve()
    }, 200)
  })
}

function login(rpc: Client, clientId: string, isStopped: () => boolean) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let watch: ReturnType<typeof setInterval> | undefined
  const attempt = rpc.login({ clientId })
  attempt.catch(() => undefined)

  return Promise.race([
    attempt,
    new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('discord login timed out')), LOGIN_TIMEOUT_MS)
    }),
    new Promise<never>((_resolve, reject) => {
      watch = setInterval(() => {
        if (!isStopped()) {
          return
        }

        reject(new Error('stopped'))
      }, 200)
    }),
  ]).finally(() => {
    if (timer) {
      clearTimeout(timer)
    }

    if (watch) {
      clearInterval(watch)
    }
  })
}

function withArt(presence: PresencePayload, art: PresenceArt): PresencePayload {
  return {
    ...presence,
    ...(presence.largeImageKey || !art.largeImageKey
      ? {}
      : {
          largeImageKey: art.largeImageKey,
          largeImageText: presence.largeImageText ?? art.largeImageText,
        }),
  }
}

function activityOf(presence: PresencePayload) {
  return {
    ...(presence.details ? { details: presence.details } : {}),
    ...(presence.state ? { state: presence.state } : {}),
    ...(presence.startTimestamp ? { startTimestamp: new Date(presence.startTimestamp) } : {}),
    ...(presence.largeImageKey ? { largeImageKey: presence.largeImageKey } : {}),
    ...(presence.largeImageText ? { largeImageText: presence.largeImageText } : {}),
    ...(presence.smallImageKey ? { smallImageKey: presence.smallImageKey } : {}),
    ...(presence.smallImageText ? { smallImageText: presence.smallImageText } : {}),
    instance: false,
  }
}

/**
 * Keeps one IPC session with Discord Desktop and reapplies the last presence after Discord restarts.
 * No bot token is used: Rich Presence only needs the public application id and the local client.
 */
export function createDiscordConnection(
  clientId: string,
  art: PresenceArt = {},
): DiscordBridge & {
  start(): void
  stop(): Promise<void>
} {
  let desired: PresencePayload | null = null
  let applied: PresencePayload | null = null
  let client: Client | null = null
  let connected = false
  let stopped = false
  let running = false
  const listeners = new Set<(connected: boolean) => void>()

  function emit(next: boolean) {
    connected = next

    for (const listener of listeners) {
      listener(next)
    }
  }

  async function push() {
    if (!client || !connected || !desired || samePresence(applied, desired)) {
      return
    }

    const next = desired
    await client.setActivity(activityOf(next))
    applied = next
  }

  async function connectOnce() {
    const rpc = new Client({ transport: 'ipc' })
    rpc.on('error', () => undefined)

    try {
      await login(rpc, clientId, () => stopped)

      if (stopped) {
        return false
      }

      client = rpc
      applied = null
      emit(true)
      console.log('Discord Desktop connected.')
      await push()

      await new Promise<void>((resolve) => {
        rpc.once('disconnected', () => resolve())
      })

      return true
    } catch {
      return false
    } finally {
      if (client === rpc) {
        client = null
        applied = null
        emit(false)
      }

      try {
        rpc.destroy()
      } catch {
        /* The pipe is already gone when Discord exits. */
      }
    }
  }

  async function run() {
    let attempt = 0

    while (!stopped) {
      const reached = await connectOnce()

      if (stopped) {
        return
      }

      if (reached) {
        attempt = 0
        console.log('Discord Desktop disconnected. Waiting for it to come back.')
      } else if (attempt === 0) {
        console.log('Discord Desktop is not running. The companion will keep trying.')
      }

      await delay(retryDelay(attempt), () => stopped)

      if (!reached) {
        attempt += 1
      }
    }
  }

  return {
    async set(presence) {
      desired = withArt(presence, art)
      await push()
    },

    async clear() {
      desired = null
      applied = null

      if (!client || !connected) {
        return
      }

      await client.clearActivity()
    },

    listen(onStatus) {
      listeners.add(onStatus)
      onStatus(connected)

      return () => {
        listeners.delete(onStatus)
      }
    },

    start() {
      if (running) {
        return
      }

      running = true
      stopped = false
      void run()
    },

    async stop() {
      stopped = true
      desired = null

      const current = client
      client = null

      if (!current || !connected) {
        emit(false)

        return
      }

      try {
        await current.clearActivity()
      } catch {
        /* Discord may already be gone. */
      }

      try {
        current.destroy()
      } catch {
        /* Closing the pipe can throw once Discord has exited. */
      }

      emit(false)
    },
  }
}
