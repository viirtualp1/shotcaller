import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ChatError, type ChatFailure, type ChatService } from '../social/chat'
import type { Database } from './database'

/** Error codes raised by the chat functions in `supabase/migrations`. */
const FAILURES: Readonly<Record<string, ChatFailure>> = {
  P0429: 'rateLimited',
  '22023': 'invalid',
  '42501': 'forbidden',
}

/** Realtime payloads are checked like any other input before they reach the screen. */
const messageRow = z.object({
  id: z.int(),
  sender: z.uuid(),
  recipient: z.uuid(),
  body: z.string().max(2000),
  created_at: z.string(),
  read_at: z.string().nullable(),
})

type MessageRow = z.infer<typeof messageRow>

const toMessage = (row: MessageRow) => ({
  id: row.id,
  sender: row.sender,
  recipient: row.recipient,
  body: row.body,
  createdAt: row.created_at,
  readAt: row.read_at,
})

const failure = (error: { code?: string } | null) => new ChatError(FAILURES[error?.code ?? ''] ?? 'failed')

export class SupabaseChat implements ChatService {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async conversation(friendId: string, olderThan?: number) {
    const { data, error } = await this.client.rpc('conversation', {
      friend: friendId,
      ...(olderThan === undefined ? {} : { older_than: olderThan }),
    })

    if (error) {
      throw failure(error)
    }

    return data.map(toMessage)
  }

  async send(friendId: string, body: string) {
    const { data, error } = await this.client.rpc('send_message', {
      friend: friendId,
      message: body,
    })

    if (error) {
      throw failure(error)
    }

    return toMessage(data)
  }

  async markRead(friendId: string) {
    const { error } = await this.client.rpc('mark_read', { friend: friendId })
    if (error) {
      throw failure(error)
    }
  }

  async unread() {
    const { data, error } = await this.client.rpc('unread_counts')
    if (error) {
      throw failure(error)
    }

    return new Map(data.map((row) => [row.sender, row.unread]))
  }

  watch(onMessage: Parameters<ChatService['watch']>[0]) {
    const channel = this.client.channel(`messages:${this.userId}`)

    for (const column of ['recipient', 'sender']) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `${column}=eq.${this.userId}`,
        },
        (payload) => {
          const row = messageRow.safeParse(payload.new)
          if (row.success) {
            onMessage(toMessage(row.data))
          }
        },
      )
    }

    channel.subscribe()

    return () => void this.client.removeChannel(channel)
  }
}
