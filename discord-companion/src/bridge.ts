import type { PresencePayload } from './protocol.ts'

/** What the WebSocket server needs from Discord, so tests can substitute a fake. */
export interface DiscordBridge {
  set(presence: PresencePayload): Promise<void>
  clear(): Promise<void>
  listen(onStatus: (connected: boolean) => void): () => void
}
