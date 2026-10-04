export {
  companionMessageSchema,
  GAME_NAME,
  HEARTBEAT_MS,
  isAllowedOrigin,
  normalizePresence,
  PRESENCE_DEBOUNCE_MS,
  PRESENCE_HOST,
  PRESENCE_PORT,
  PRESENCE_URL,
  presenceMessageSchema,
  retryDelay,
  RETRY_DELAYS_MS,
  samePresence,
  SESSION_STALE_MS,
  visiblePresence,
} from '../../../discord-companion/src/protocol.ts'

export type {
  CompanionMessage,
  PresenceMessage,
  PresencePayload,
  PresenceSession,
} from '../../../discord-companion/src/protocol.ts'
