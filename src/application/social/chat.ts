export const MESSAGE_MAX_LENGTH = 500

export interface ChatMessage {
  readonly id: number
  readonly sender: string
  readonly recipient: string
  /** Plain text, already cleaned by the server. Always shown as text, never as HTML. */
  readonly body: string
  readonly createdAt: string
  readonly readAt: string | null
}

export type ChatFailure = 'rateLimited' | 'invalid' | 'forbidden' | 'failed'

export class ChatError extends Error {
  constructor(readonly reason: ChatFailure) {
    super(`Chat request failed: ${reason}`)
  }
}

/** Conversations with friends of the signed-in coach. */
export interface ChatService {
  /** The latest messages with a friend, or the ones before `olderThan`; oldest first. */
  conversation(friendId: string, olderThan?: number): Promise<ChatMessage[]>
  /** Rejects with a ChatError. */
  send(friendId: string, body: string): Promise<ChatMessage>
  markRead(friendId: string): Promise<void>
  /** Unread messages per friend. */
  unread(): Promise<ReadonlyMap<string, number>>
  /** Calls back for every new message to or from the coach. Returns a function that stops listening. */
  watch(onMessage: (message: ChatMessage) => void): () => void
}

/** How many messages one page of a conversation holds; a full page means there may be older ones. */
export const CONVERSATION_PAGE = 50
