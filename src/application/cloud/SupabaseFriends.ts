import type { SupabaseClient } from '@supabase/supabase-js'
import type { FriendRequestResult, FriendStatus, FriendsService } from '../social/friends'
import type { Database } from './database'

const FRIEND_STATUSES: ReadonlySet<string> = new Set<FriendStatus>(['friend', 'incoming', 'outgoing'])

const REQUEST_RESULTS: ReadonlySet<string> = new Set<FriendRequestResult>([
  'sent',
  'accepted',
  'friends',
  'notFound',
  'self',
  'limit',
  'cooldown',
])

/** Everyone signed in shares one presence channel; fine until the player count calls for per-friend channels. */
const PRESENCE_CHANNEL = 'online'

/** Friends through the functions in `supabase/migrations`; the tables themselves are not readable directly. */
export class SupabaseFriends implements FriendsService {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async card() {
    const { data, error } = await this.client.rpc('ensure_coach')
    if (error) {
      throw error
    }

    return {
      id: data.id,
      name: data.name,
      avatar: data.avatar,
      rating: data.rating,
      friendCode: data.friend_code,
    }
  }

  async list() {
    const { data, error } = await this.client.rpc('list_friends')
    if (error) {
      throw error
    }

    return data
      .filter((row) => FRIEND_STATUSES.has(row.status))
      .map((row) => ({
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        rating: row.rating,
        status: row.status as FriendStatus,
        since: row.since,
      }))
  }

  async request(code: string) {
    const { data, error } = await this.client.rpc('request_friend', { code })
    if (error) {
      throw error
    }

    if (!REQUEST_RESULTS.has(data)) {
      throw new Error(`Unexpected friend request result: ${data}`)
    }

    return data as FriendRequestResult
  }

  async respond(coachId: string, accept: boolean) {
    const { error } = await this.client.rpc('respond_friend', {
      other: coachId,
      accept,
    })

    if (error) {
      throw error
    }
  }

  async remove(coachId: string) {
    const { error } = await this.client.rpc('remove_friend', { other: coachId })
    if (error) {
      throw error
    }
  }

  async block(coachId: string) {
    const { error } = await this.client.rpc('block_coach', { other: coachId })
    if (error) {
      throw error
    }
  }

  async unblock(coachId: string) {
    const { error } = await this.client.rpc('unblock_coach', { other: coachId })
    if (error) {
      throw error
    }
  }

  async blocked() {
    const { data, error } = await this.client.rpc('list_blocked')
    if (error) {
      throw error
    }

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      rating: row.rating,
    }))
  }

  watch(onChange: () => void) {
    const channel = this.client.channel(`friendships:${this.userId}`)

    for (const column of ['requester', 'addressee']) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `${column}=eq.${this.userId}`,
        },
        () => onChange(),
      )
    }

    channel.subscribe()

    return () => void this.client.removeChannel(channel)
  }

  presence(onChange: (online: ReadonlySet<string>) => void) {
    const channel = this.client.channel(PRESENCE_CHANNEL, {
      config: {
        presence: { key: this.userId },
      },
    })

    channel.on('presence', { event: 'sync' }, () => onChange(new Set(Object.keys(channel.presenceState()))))

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track({ online: true })
      }
    })

    return () => void this.client.removeChannel(channel)
  }
}
