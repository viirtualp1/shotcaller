import {
  companionMessageSchema,
  HEARTBEAT_MS,
  normalizePresence,
  PRESENCE_DEBOUNCE_MS,
  PRESENCE_URL,
  presenceMessageSchema,
  retryDelay,
  samePresence,
  type CompanionMessage,
  type PresenceMessage,
  type PresencePayload,
} from './protocol'

type Schedule = (fn: () => void, ms: number) => () => void

export interface DiscordPresenceClient {
  connect(): void
  setPresence(presence: PresencePayload): void
  clearPresence(): void
  disconnect(): void
}

export interface PresenceClientOptions {
  readonly enabled: boolean
  readonly url?: string
  readonly WebSocket?: typeof globalThis.WebSocket
  readonly schedule?: Schedule
  readonly bindHide?: (onHide: () => void, onShow: () => void) => () => void
  readonly onMessage?: (message: CompanionMessage) => void
}

const defaultSchedule: Schedule = (fn, ms) => {
  const timer = setTimeout(fn, ms)

  return () => clearTimeout(timer)
}

function bindPageLifecycle(onHide: () => void, onShow: () => void) {
  window.addEventListener('pagehide', onHide)
  window.addEventListener('beforeunload', onHide)
  window.addEventListener('pageshow', onShow)

  return () => {
    window.removeEventListener('pagehide', onHide)
    window.removeEventListener('beforeunload', onHide)
    window.removeEventListener('pageshow', onShow)
  }
}

/**
 * Talks only to the local companion. Discord IPC stays on the other side of that socket.
 * The session clock is fixed at startup so later status edits do not restart the elapsed timer.
 */
export function createDiscordPresence(options: PresenceClientOptions): DiscordPresenceClient {
  const enabled = options.enabled
  const url = options.url ?? PRESENCE_URL
  const Socket = options.WebSocket ?? globalThis.WebSocket
  const schedule = options.schedule ?? defaultSchedule
  const startedAt = Date.now()

  let stopped = !enabled
  let attempt = 0
  let socket: WebSocket | null = null
  let opening = false
  let concealed = false
  let announced = false
  let desired: PresencePayload | null = null
  let sent = ''
  let retryCancel: (() => void) | null = null
  let debounceCancel: (() => void) | null = null
  let heartbeatCancel: (() => void) | null = null
  let unbind: () => void = () => undefined

  function payload() {
    if (!desired) {
      return null
    }

    return normalizePresence({
      ...desired,
      startTimestamp: startedAt,
    })
  }

  function transmit(message: PresenceMessage) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }

    const parsed = presenceMessageSchema.safeParse(message)

    if (!parsed.success) {
      return false
    }

    socket.send(JSON.stringify(parsed.data))

    return true
  }

  function flush() {
    debounceCancel = null
    const next = payload()

    if (!announced) {
      return
    }

    const encoded = JSON.stringify(next)

    if (!socket || socket.readyState !== WebSocket.OPEN || encoded === sent) {
      return
    }

    sent = encoded

    transmit(
      next
        ? {
            type: 'set-presence',
            payload: next,
          }
        : { type: 'clear-presence' },
    )
  }

  function scheduleFlush() {
    if (debounceCancel) {
      return
    }

    debounceCancel = schedule(() => flush(), PRESENCE_DEBOUNCE_MS)
  }

  function stopHeartbeat() {
    heartbeatCancel?.()
    heartbeatCancel = null
  }

  function startHeartbeat() {
    stopHeartbeat()

    heartbeatCancel = schedule(() => {
      transmit({ type: 'ping' })
      startHeartbeat()
    }, HEARTBEAT_MS)
  }

  function scheduleRetry() {
    if (stopped || retryCancel) {
      return
    }

    const delay = retryDelay(attempt)
    attempt += 1

    retryCancel = schedule(() => {
      retryCancel = null
      open()
    }, delay)
  }

  function open() {
    if (stopped || socket || opening) {
      return
    }

    opening = true
    let next: WebSocket

    try {
      next = new Socket(url)
    } catch {
      opening = false
      scheduleRetry()

      return
    }

    socket = next

    next.addEventListener('open', () => {
      opening = false
      attempt = 0
      sent = ''
      startHeartbeat()
      debounceCancel?.()
      debounceCancel = null
      flush()
    })

    next.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') {
        return
      }

      try {
        const parsed = companionMessageSchema.safeParse(JSON.parse(event.data))

        if (parsed.success) {
          options.onMessage?.(parsed.data)
        }
      } catch {
        /* Ignore a frame that is not JSON. */
      }
    })

    next.addEventListener('close', () => {
      if (socket !== next) {
        return
      }

      socket = null
      opening = false
      stopHeartbeat()

      if (!stopped) {
        scheduleRetry()
      }
    })

    next.addEventListener('error', () => undefined)
  }

  function onHide() {
    if (concealed) {
      return
    }

    concealed = true
    transmit({ type: 'clear-presence' })
    sent = 'null'
  }

  function onShow() {
    if (!concealed) {
      return
    }

    concealed = false
    sent = ''
    flush()
  }

  if (enabled && options.bindHide) {
    unbind = options.bindHide(onHide, onShow)
  } else if (enabled && typeof window !== 'undefined') {
    unbind = bindPageLifecycle(onHide, onShow)
  }

  return {
    connect() {
      if (!enabled) {
        return
      }

      stopped = false
      open()
    },

    setPresence(presence) {
      if (!enabled) {
        return
      }

      const next = normalizePresence(presence)
      announced = true

      if (concealed) {
        desired = next

        return
      }

      if (samePresence(desired, next)) {
        return
      }

      desired = next
      scheduleFlush()
    },

    clearPresence() {
      if (!enabled) {
        return
      }

      desired = null
      announced = true
      debounceCancel?.()
      debounceCancel = null
      flush()
    },

    disconnect() {
      stopped = true
      retryCancel?.()
      retryCancel = null
      debounceCancel?.()
      debounceCancel = null
      stopHeartbeat()
      unbind()
      socket?.close()
      socket = null
      opening = false
    },
  }
}
