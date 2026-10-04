import { createServer, type Server as HttpServer } from 'node:http'
import { WebSocket, WebSocketServer, type RawData } from 'ws'
import type { DiscordBridge } from './bridge.ts'
import {
  companionMessageSchema,
  isAllowedOrigin,
  PRESENCE_HOST,
  presenceMessageSchema,
  SESSION_STALE_MS,
  visiblePresence,
  type CompanionMessage,
  type PresencePayload,
} from './protocol.ts'

interface LiveSession {
  presence: PresencePayload | null
  seenAt: number
  socket: WebSocket
}

export interface PresenceServer {
  port: number
  host: string
  close(): Promise<void>
}

function textOf(data: RawData) {
  if (typeof data === 'string') {
    return data
  }

  if (Buffer.isBuffer(data)) {
    return data.toString('utf8')
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf8')
  }

  return Buffer.from(data).toString('utf8')
}

function send(socket: WebSocket, message: CompanionMessage) {
  if (socket.readyState !== WebSocket.OPEN) {
    return
  }

  socket.send(JSON.stringify(message))
}

/**
 * Localhost-only bridge. Presence stays up while any session still wants it, and clears when the last one leaves
 * or stops heartbeating.
 */
export function startPresenceServer(
  bridge: DiscordBridge,
  options: { port: number; host?: string; staleMs?: number; sweepMs?: number } = { port: 0 },
): Promise<PresenceServer> {
  const host = options.host ?? PRESENCE_HOST
  const staleMs = options.staleMs ?? SESSION_STALE_MS
  const sessions = new Set<LiveSession>()
  let discordConnected = false
  let applied = ''

  const http = createServer((_request, response) => {
    response.writeHead(404)
    response.end()
  })

  const sockets = new WebSocketServer({
    server: http,
    maxPayload: 4096,
    perMessageDeflate: false,
    verifyClient: (info: { origin: string }) => isAllowedOrigin(info.origin || undefined),
  })

  const stopListen = bridge.listen((connected) => {
    discordConnected = connected

    for (const session of sessions) {
      send(session.socket, { type: 'discord-status', connected })
    }
  })

  async function publish() {
    const presence = visiblePresence([...sessions], Date.now(), staleMs)
    const encoded = JSON.stringify(presence)

    if (encoded === applied) {
      return
    }

    applied = encoded

    try {
      if (presence) {
        await bridge.set(presence)
      } else {
        await bridge.clear()
      }
    } catch {
      applied = ''
    }
  }

  function forget(session: LiveSession) {
    if (!sessions.delete(session)) {
      return
    }

    void publish()
  }

  sockets.on('connection', (socket, request) => {
    const origin = request.headers.origin

    if (!isAllowedOrigin(typeof origin === 'string' ? origin : undefined)) {
      socket.close(1008, 'origin')

      return
    }

    const session: LiveSession = {
      presence: null,
      seenAt: Date.now(),
      socket,
    }

    sessions.add(session)
    send(socket, companionMessageSchema.parse({ type: 'ready', discordConnected }))

    socket.on('message', (data, isBinary) => {
      if (isBinary) {
        send(socket, { type: 'error', message: 'expected json' })

        return
      }

      let json: unknown

      try {
        json = JSON.parse(textOf(data))
      } catch {
        send(socket, { type: 'error', message: 'expected json' })

        return
      }

      const parsed = presenceMessageSchema.safeParse(json)

      if (!parsed.success) {
        send(socket, { type: 'error', message: 'invalid message' })

        return
      }

      session.seenAt = Date.now()
      const message = parsed.data

      if (message.type === 'ping') {
        send(socket, { type: 'pong' })

        return
      }

      session.presence = message.type === 'set-presence' ? message.payload : null
      void publish()
    })

    socket.on('close', () => forget(session))
    socket.on('error', () => forget(session))
  })

  const sweep = setInterval(() => {
    const now = Date.now()

    for (const session of sessions) {
      if (now - session.seenAt < staleMs) {
        continue
      }

      session.socket.close(1001, 'heartbeat')
      forget(session)
    }
  }, options.sweepMs ?? 5_000)

  sweep.unref?.()

  return new Promise((resolve, reject) => {
    const fail = (error: Error) => {
      clearInterval(sweep)
      stopListen()
      reject(error)
    }

    http.once('error', fail)
    http.listen(options.port, host, () => {
      http.off('error', fail)
      const address = http.address()

      resolve({
        port: address && typeof address === 'object' ? address.port : options.port,
        host: address && typeof address === 'object' ? address.address : host,
        close: () => closeServer(http, sockets, sweep, stopListen, sessions),
      })
    })
  })
}

function closeServer(
  http: HttpServer,
  sockets: WebSocketServer,
  sweep: ReturnType<typeof setInterval>,
  stopListen: () => void,
  sessions: Set<LiveSession>,
) {
  clearInterval(sweep)
  stopListen()

  for (const session of sessions) {
    session.socket.close(1001, 'shutdown')
  }

  sessions.clear()

  return new Promise<void>((resolve, reject) => {
    sockets.close(() => {
      http.close((error) => (error ? reject(error) : resolve()))
    })
  })
}
