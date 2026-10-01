import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database'
import { privacySchema, PRIVACY_VERSION, type Telemetry } from './privacy'

export class SupabasePrivacy {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  /** Recheck after awaits so a queued operation cannot run against another account. */
  private async assertAccount() {
    const { data, error } = await this.client.auth.getSession()
    if (error) {
      throw error
    }

    if (data.session?.user.id !== this.userId || data.session.user.is_anonymous) {
      throw new Error('Privacy account changed')
    }

    return data.session.access_token
  }

  async load() {
    const token = await this.assertAccount()
    const { data, error } = await this.client.rpc('my_privacy').setHeader('Authorization', `Bearer ${token}`)
    if (error) {
      throw error
    }

    return privacySchema.nullable().parse(data)
  }

  async save(telemetry: boolean) {
    const token = await this.assertAccount()

    const { data, error } = await this.client
      .rpc('set_privacy', {
        policy_version: PRIVACY_VERSION,
        allow_telemetry: telemetry,
      })
      .setHeader('Authorization', `Bearer ${token}`)

    if (error) {
      throw error
    }

    return privacySchema.parse(data)
  }

  async collect(matchId: string, finishedAt: string, payload: Telemetry) {
    const token = await this.assertAccount()

    const { error } = await this.client.functions.invoke('game-telemetry', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        policyVersion: PRIVACY_VERSION,
        matchId,
        finishedAt,
        payload,
      },
    })

    if (error) {
      throw error
    }
  }
}
