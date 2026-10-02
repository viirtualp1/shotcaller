import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { MatchRecord, Profile } from '@/domain/profile/Profile'
import { feedbackSchema, type Feedback } from '../feedback'
import { fromProfileEnvelope, toProfileEnvelope } from '../persistence/profileSnapshot'
import type { AccountMode, CloudAccount, CloudStore } from './CloudStore'
import type { CloudConfig } from './config'
import type { Database } from './database'
import { SupabaseChat } from './SupabaseChat'
import { SupabaseDuels } from './SupabaseDuels'
import { SupabaseFriends } from './SupabaseFriends'
import { SupabaseLeaderboard } from './SupabaseLeaderboard'
import { SupabasePrivacy } from './SupabasePrivacy'
import { asJson } from './json'
import { settledRatingsSchema } from './ratingsSchema'

const UNIQUE_VIOLATION = '23505'

export class CloudError extends Error {}

/** Only an https picture is shown; the metadata comes from the sign-in provider. */
function photoOf(user: User) {
  const url: unknown = user.user_metadata?.avatar_url ?? user.user_metadata?.picture
  return typeof url === 'string' && url.startsWith('https://') ? url : null
}

const toAccount = (user: User): CloudAccount => ({
  id: user.id,
  anonymous: user.is_anonymous ?? false,
  email: user.email || null,
  photo: photoOf(user),
})

const profileRow = (profile: Profile) => ({
  name: profile.name,
  avatar: profile.avatar,
  rating: profile.rating,
  data: asJson(toProfileEnvelope(profile)),
})

/**
 * Supabase behind the game's cloud interfaces. Only the publishable key is ever used here:
 * every read and write goes through row level security as the signed-in coach.
 */
export class SupabaseCloud implements CloudStore {
  private constructor(
    private readonly client: SupabaseClient<Database>,
    readonly config: CloudConfig,
  ) {}

  /** Loads the Supabase client on demand, so a game without cloud saves never downloads it. */
  static async connect(config: CloudConfig) {
    const { createClient } = await import('@supabase/supabase-js')

    const client = createClient<Database>(config.url, config.key, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })

    return new SupabaseCloud(client, config)
  }

  async account() {
    const { data, error } = await this.client.auth.getSession()
    if (error) {
      throw error
    }

    return data.session ? toAccount(data.session.user) : null
  }

  /** A guest account is created the first time there is something to save. */
  async ensureAccount() {
    const existing = await this.account()
    if (existing) {
      return existing
    }

    const { data, error } = await this.client.auth.signInAnonymously()
    if (error || !data.user) {
      throw error ?? new CloudError('Anonymous sign-in returned no user')
    }

    return toAccount(data.user)
  }

  onAccountChange(listener: (account: CloudAccount | null) => void) {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      /* Supabase asks not to call it back from inside this callback, so hand over on the next task. */
      setTimeout(() => listener(session ? toAccount(session.user) : null))
    })

    return () => data.subscription.unsubscribe()
  }

  /** Sends a one-time code (and a link) to the address. */
  async sendEmail(email: string, mode: AccountMode) {
    const emailRedirectTo = this.redirectTo()

    const { error } =
      mode === 'link'
        ? await this.client.auth.updateUser({ email }, { emailRedirectTo })
        : await this.client.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false,
              emailRedirectTo,
            },
          })

    if (error) {
      throw error
    }
  }

  async verifyEmail(email: string, code: string, mode: AccountMode) {
    const { error } = await this.client.auth.verifyOtp({
      email,
      token: code,
      type: mode === 'link' ? 'email_change' : 'email',
    })

    if (error) {
      throw error
    }
  }

  /** Leaves the page for Google and comes back signed in. */
  /**
   * Signs in or up with Google. A new Google account starts empty, and the sync then moves this device's
   * progress into it; an existing one asks which progress to keep. No identity linking is needed for that.
   */
  async google() {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: this.redirectTo() },
    })

    if (error) {
      throw error
    }
  }

  /** Friends of the given signed-in coach, over the same connection. */
  friends(userId: string) {
    return new SupabaseFriends(this.client, userId)
  }

  leaderboard() {
    return new SupabaseLeaderboard(this.client)
  }

  privacy(userId: string) {
    return new SupabasePrivacy(this.client, userId)
  }

  /** Feedback is sent deliberately by a player, including guests, independently of telemetry consent. */
  async sendFeedback(feedback: Feedback) {
    const request = feedbackSchema.parse(feedback)
    await this.ensureAccount()

    const { error } = await this.client.rpc('submit_feedback', {
      request_id: request.id,
      category: request.kind,
      subject: request.subject,
      message: request.message,
      reply_email: request.email || null,
      game_version: request.version,
      language: request.locale,
    })

    if (error) {
      throw error
    }
  }

  /** Conversations of the given signed-in coach, over the same connection. */
  chat(userId: string) {
    return new SupabaseChat(this.client, userId)
  }

  /** Online duels of the given signed-in coach, over the same connection. */
  duels(userId: string) {
    return new SupabaseDuels(this.client, userId)
  }

  async signOut() {
    const { error } = await this.client.auth.signOut()
    if (error) {
      throw error
    }
  }

  /** The server takes the caller from their session; the browser never supplies an account ID. */
  async deleteAccount() {
    const { error } = await this.client.rpc('delete_account')
    if (error) {
      throw error
    }

    // Deletion has already succeeded. A revoked server session must not turn it into a retryable failure.
    try {
      await this.client.auth.signOut({ scope: 'local' })
    } catch {
      // A deleted account stays deleted even when its final logout cannot reach Auth.
    }
  }

  async ratings() {
    const { data, error } = await this.client.rpc('my_ratings')
    if (error) {
      throw error
    }

    const parsed = settledRatingsSchema.nullable().safeParse(data)

    return parsed.success ? parsed.data : null
  }

  async load() {
    const id = await this.userId()

    const { data, error } = await this.client
      .from('profiles')
      .select('revision, data')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return null
    }

    const profile = fromProfileEnvelope(data.data)
    if (!profile) {
      throw new CloudError('The cloud profile was saved by a newer version of the game')
    }

    return {
      profile,
      revision: data.revision,
    }
  }

  async create(profile: Profile) {
    const id = await this.userId()

    const { error } = await this.client.from('profiles').insert({
      id,
      ...profileRow(profile),
      revision: 1,
    })

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return 'conflict' as const
      }

      throw error
    }

    return {
      profile,
      revision: 1,
    }
  }

  async save(profile: Profile, baseRevision: number) {
    const id = await this.userId()
    const revision = baseRevision + 1

    const { data, error } = await this.client
      .from('profiles')
      .update({
        ...profileRow(profile),
        revision,
      })
      .eq('id', id)
      .eq('revision', baseRevision)
      .select('revision')

    if (error) {
      throw error
    }

    return data.length
      ? {
          profile,
          revision,
        }
      : ('conflict' as const)
  }

  async addMatches(records: readonly MatchRecord[]) {
    if (!records.length) {
      return
    }

    const userId = await this.userId()

    const rows = records.map((record) => ({
      user_id: userId,
      id: record.id,
      played_at: record.playedAt,
      verdict: record.verdict,
      data: asJson({
        ...record,
        roundLineups: [],
        replays: [],
      }),
    }))

    const { error } = await this.client.from('matches').upsert(rows, {
      onConflict: 'user_id,id',
      ignoreDuplicates: true,
    })

    if (error) {
      throw error
    }
  }

  private async userId() {
    const account = await this.account()
    if (!account) {
      throw new CloudError('Not signed in')
    }

    return account.id
  }

  /** Where email links and Google send the player back: the game itself, without any page hash. */
  private redirectTo() {
    return globalThis.location.origin + globalThis.location.pathname
  }
}
