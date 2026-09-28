import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { HERO_IDS, MODE_IDS } from '@/content/ids'
import { DEFAULT_MODE } from '@/content/modes'
import type { FriendRequestResult, FriendStatus, FriendsService, PresenceStatus } from '../social/friends'
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

const count = z.number().int().nonnegative()
const heroId = z.enum(HERO_IDS)

/** Other coaches' presence and profiles come from their devices, so they are checked before use. */
const presenceStatus = z.object({
  activity: z.enum(['menu', 'match', 'duel']),
  round: z.number().int().min(1).max(40).nullable(),
})

const modeRatings = z.object({
  threeLanes: count.catch(0),
  twoLanes: count.catch(0),
  oneLane: count.catch(0),
})

const friendProfile = z
  .object({
    id: z.uuid(),
    name: z.string().max(40),
    avatar: z.string().max(32).nullable(),
    rating: count,
    /** Missing before game modes, or before the coach saved a profile with them. */
    ratings: modeRatings.nullable().catch(null),
    peakRating: count.catch(0),
    xp: count.catch(0),
    totals: z
      .object({
        matches: count,
        wins: count,
        losses: count,
        draws: count,
        bestWinStreak: count.catch(0),
      })
      .nullable()
      .catch(null),
    recent: z
      .array(
        z.object({
          id: z.string().max(64),
          playedAt: z.string(),
          mode: z.enum(MODE_IDS).catch(DEFAULT_MODE),
          duel: z.boolean().catch(false),
          difficulty: z.enum(['relaxed', 'standard']).catch('standard'),
          verdict: z.enum(['win', 'loss', 'draw']),
          rounds: count,
          roundsWon: count,
          roundsLost: count,
          lineup: z
            .array(
              z.object({
                heroId,
                stars: z.union([z.literal(1), z.literal(2), z.literal(3)]),
              }),
            )
            .max(10),
          mvp: heroId.nullable().catch(null),
          ratingBefore: count,
          ratingAfter: count,
          xp: count.catch(0),
        }),
      )
      .max(10)
      .catch([]),
  })
  /* Before game modes there was one rating, earned on three lanes. */
  .transform(({ ratings, ...rest }) => ({
    ...rest,
    ratings: ratings ?? {
      threeLanes: rest.rating,
      twoLanes: 0,
      oneLane: 0,
    },
  }))

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

  async profile(coachId: string) {
    const { data, error } = await this.client.rpc('coach_profile', { friend: coachId })
    if (error) {
      throw error
    }

    const parsed = friendProfile.safeParse(data)

    return parsed.success ? parsed.data : null
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

  presence(initial: PresenceStatus) {
    let status = initial
    let listener: (online: ReadonlyMap<string, PresenceStatus>) => void = () => undefined

    const channel = this.client.channel(PRESENCE_CHANNEL, {
      config: {
        presence: { key: this.userId },
      },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const online = new Map<string, PresenceStatus>()

      for (const [id, metas] of Object.entries(channel.presenceState())) {
        const latest = presenceStatus.safeParse(metas.at(-1))
        online.set(
          id,
          latest.success
            ? latest.data
            : {
                activity: 'menu',
                round: null,
              },
        )
      }

      listener(online)
    })

    let joined = false

    channel.subscribe((state) => {
      if (state === 'SUBSCRIBED') {
        joined = true
        void channel.track(status)
      }
    })

    return {
      onChange: (next: typeof listener) => {
        listener = next
      },
      update: (next: PresenceStatus) => {
        status = next

        if (joined) {
          void channel.track(status)
        }
      },
      leave: () => void this.client.removeChannel(channel),
    }
  }
}
