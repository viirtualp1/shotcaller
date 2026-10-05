import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { HERO_IDS, MODE_IDS } from '@/content/ids'
import { DEFAULT_MODE } from '@/content/modes'
import { matchRecordSchema } from '../persistence/profileSnapshot'
import {
  coachPhoto,
  REPORT_DETAILS_MAX,
  type FriendRequestResult,
  type FriendStatus,
  type FriendsService,
  type PresenceStatus,
  type ReportReason,
} from '../social/friends'
import type { Database } from './database'
import { liveMatchSchema, type LiveMatch } from '../social/liveMatch'
import { asJson } from './json'
import { modeRatingsSchema } from './ratingsSchema'

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

/** A small heartbeat returns only this coach's online friends. */
const PRESENCE_INTERVAL = 30_000

const count = z.int().nonnegative()
const heroId = z.enum(HERO_IDS)

/** Other coaches' presence and profiles come from their devices, so they are checked before use. */
const presenceStatus = z.object({
  activity: z.enum(['menu', 'match', 'duel']),
  round: z.int().min(1).max(40).nullable(),
})

const friendProfile = z
  .object({
    id: z.uuid(),
    name: z.string().max(40),
    avatar: z.string().max(32).nullable(),
    photo: z
      .string()
      .max(2048)
      .nullable()
      .catch(null)
      .transform((url) => coachPhoto(url)),
    rating: count,
    /** Missing before game modes, or before the coach saved a profile with them. */
    ratings: modeRatingsSchema.nullable().catch(null),
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

/** The server tells only whether it was a duel; the opponent's name stays with the friend. */
const friendMatch = matchRecordSchema
  .extend({ duel: z.boolean().catch(false) })
  .transform(({ duel, ...rest }) => ({
    ...rest,
    duel: duel ? { opponentName: null } : null,
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
      photo: coachPhoto(data.photo),
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
        photo: coachPhoto(row.photo),
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

  async requestLeaderboard(coachId: string) {
    const { data, error } = await this.client.rpc('request_leaderboard_friend', { other: coachId })
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

  async report(coachId: string, reason: ReportReason, details: string) {
    const { error } = await this.client.rpc('report_player', {
      report_id: crypto.randomUUID(),
      player: coachId,
      reason,
      details: details.trim().slice(0, REPORT_DETAILS_MAX),
    })

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
      photo: coachPhoto(row.photo),
      rating: row.rating,
    }))
  }

  async setPhoto(url: string | null) {
    const { error } = await this.client.rpc('set_coach_photo', { url })
    if (error) {
      throw error
    }
  }

  async profile(coachId: string) {
    const { data, error } = await this.client.rpc('coach_profile', { friend: coachId })
    if (error) {
      throw error
    }

    const parsed = friendProfile.safeParse(data)

    return parsed.success ? parsed.data : null
  }

  async match(coachId: string, matchId: string) {
    const { data, error } = await this.client.rpc('coach_match', {
      friend: coachId,
      match_id: matchId,
    })

    if (error) {
      throw error
    }

    const parsed = friendMatch.safeParse(data)

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

  async publishLiveMatch(snapshot: LiveMatch | null) {
    const { data, error } = await this.client.rpc('publish_live_match', {
      payload: snapshot ? asJson(liveMatchSchema.parse(snapshot)) : null,
    })

    if (error) {
      throw error
    }

    return data === true
  }

  async keepLiveMatch() {
    const { data, error } = await this.client.rpc('keep_live_match')
    if (error) {
      throw error
    }

    return data
  }

  async liveMatch(coachId: string) {
    const { data, error } = await this.client.rpc('coach_live_match', { friend: coachId })
    if (error) {
      throw error
    }

    const parsed = liveMatchSchema.safeParse(data)

    return parsed.success ? parsed.data : null
  }

  presence(initial: PresenceStatus) {
    let status = initial
    let listener: (online: ReadonlyMap<string, PresenceStatus>) => void = () => undefined
    let left = false
    let running = false
    let changed = false

    const refresh = async () => {
      if (left || running) {
        return
      }

      running = true
      changed = false

      try {
        const { data, error } = await this.client
          .rpc('friends_online', {
            doing: status.activity,
            doing_round: status.round,
          })
          .abortSignal(AbortSignal.timeout(12_000))

        if (left || error) {
          return
        }

        const online = new Map<string, PresenceStatus>()
        for (const row of data ?? []) {
          const parsed = presenceStatus.safeParse(row)
          if (parsed.success && z.uuid().safeParse(row.id).success) {
            online.set(row.id, parsed.data)
          }
        }

        listener(online)
      } catch {
        // The next heartbeat retries a lost connection.
      } finally {
        running = false

        if (changed && !left) {
          void refresh()
        }
      }
    }

    const timer = setInterval(() => void refresh(), PRESENCE_INTERVAL)
    void refresh()

    return {
      onChange: (next: typeof listener) => {
        listener = next
      },
      update: (next: PresenceStatus) => {
        status = next

        changed = true
        void refresh()
      },
      leave: () => {
        left = true
        clearInterval(timer)
      },
    }
  }
}
