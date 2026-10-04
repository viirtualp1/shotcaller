import { z } from 'zod'

/** Discord Desktop already binds local RPC on 6463–6472, so the bridge uses a different port. */
export const PRESENCE_PORT = 38471

export const PRESENCE_HOST = '127.0.0.1'

export const PRESENCE_URL = `ws://${PRESENCE_HOST}:${PRESENCE_PORT}`

export const GAME_NAME = 'The Shotcaller'

export const HEARTBEAT_MS = 15_000

/** Two missed heartbeats, plus a little slack, before a silent tab is treated as gone. */
export const SESSION_STALE_MS = 35_000

export const PRESENCE_DEBOUNCE_MS = 400

export const RETRY_DELAYS_MS = [1000, 2000, 5000, 10_000, 30_000] as const

const imageKey = z
  .string()
  .regex(/^[a-z0-9_-]{1,64}$/i)
  .optional()

export const presencePayloadSchema = z.strictObject({
  details: z.string().min(1).max(128).optional(),
  state: z.string().min(1).max(128).optional(),
  startTimestamp: z.number().int().positive().max(10_000_000_000_000).optional(),
  largeImageKey: imageKey,
  largeImageText: z.string().min(1).max(128).optional(),
  smallImageKey: imageKey,
  smallImageText: z.string().min(1).max(128).optional(),
})

export const presenceMessageSchema = z.union([
  z.strictObject({
    type: z.literal('set-presence'),
    payload: presencePayloadSchema,
  }),
  z.strictObject({
    type: z.literal('clear-presence'),
  }),
  z.strictObject({
    type: z.literal('ping'),
  }),
])

export const companionMessageSchema = z.union([
  z.strictObject({
    type: z.literal('ready'),
    discordConnected: z.boolean(),
  }),
  z.strictObject({
    type: z.literal('discord-status'),
    connected: z.boolean(),
  }),
  z.strictObject({
    type: z.literal('pong'),
  }),
  z.strictObject({
    type: z.literal('error'),
    message: z.string().max(200),
  }),
])

export type PresencePayload = z.infer<typeof presencePayloadSchema>

export type PresenceMessage = z.infer<typeof presenceMessageSchema>

export type CompanionMessage = z.infer<typeof companionMessageSchema>

export interface PresenceSession {
  readonly presence: PresencePayload | null
  readonly seenAt: number
}

const PRODUCTION_HOSTS = new Set(['theshotcaller.online', 'www.theshotcaller.online'])

export function retryDelay(attempt: number) {
  const index = Math.max(0, Math.min(Math.floor(attempt), RETRY_DELAYS_MS.length - 1))

  return RETRY_DELAYS_MS[index]!
}

export function normalizePresence(presence: PresencePayload): PresencePayload {
  return {
    ...(presence.details ? { details: presence.details } : {}),
    ...(presence.state ? { state: presence.state } : {}),
    ...(presence.startTimestamp ? { startTimestamp: presence.startTimestamp } : {}),
    ...(presence.largeImageKey ? { largeImageKey: presence.largeImageKey } : {}),
    ...(presence.largeImageText ? { largeImageText: presence.largeImageText } : {}),
    ...(presence.smallImageKey ? { smallImageKey: presence.smallImageKey } : {}),
    ...(presence.smallImageText ? { smallImageText: presence.smallImageText } : {}),
  }
}

export function samePresence(left: PresencePayload | null, right: PresencePayload | null) {
  return JSON.stringify(left && normalizePresence(left)) === JSON.stringify(right && normalizePresence(right))
}

/** The presence Discord should show: the newest live session that still wants one. */
export function visiblePresence(
  sessions: readonly PresenceSession[],
  now: number,
  staleMs = SESSION_STALE_MS,
) {
  let chosen: PresencePayload | null = null
  let seenAt = -1

  for (const session of sessions) {
    if (session.presence === null || now - session.seenAt >= staleMs || session.seenAt < seenAt) {
      continue
    }

    chosen = session.presence
    seenAt = session.seenAt
  }

  return chosen
}

/** Browser origins allowed to drive presence. A missing or foreign origin is refused. */
export function isAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return false
  }

  let url: URL

  try {
    url = new URL(origin)
  } catch {
    return false
  }

  if (url.username || url.password || (url.pathname !== '/' && url.pathname !== '')) {
    return false
  }

  if (url.protocol === 'https:' && PRODUCTION_HOSTS.has(url.hostname)) {
    return true
  }

  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
}
