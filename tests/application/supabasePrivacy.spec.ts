import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '@/application/cloud/database'
import { SupabasePrivacy } from '@/application/cloud/SupabasePrivacy'
import { createProfile } from '@/domain/profile/Profile'
import { telemetryOf } from '@/application/cloud/privacy'
import { play, WIN, duelMatch } from '../helpers/profile'

function connection(id = 'one', anonymous = false) {
  const headers = vi.fn(async () => ({
    data: {
      version: 2,
      telemetry: false,
      telemetrySince: null,
    },
    error: null,
  }))

  const client = {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            user: {
              id,
              is_anonymous: anonymous,
            },
            access_token: 'fixture-token',
          },
        },
        error: null,
      })),
    },
    rpc: vi.fn(() => ({ setHeader: headers })),
    functions: {
      invoke: vi.fn(async () => ({
        data: {},
        error: null,
      })),
    },
  }

  return {
    client,
    headers,
    service: new SupabasePrivacy(client as unknown as SupabaseClient<Database>, 'one'),
  }
}

describe('privacy request credentials', () => {
  const record = play(createProfile('2026-09-20T00:00:00Z'), duelMatch(WIN)).record
  it('pins consent requests to the session that was checked, across asynchronous account changes', async () => {
    const { service, headers, client } = connection()
    await service.load()
    await service.save(false)

    expect(headers.mock.calls).toEqual([
      ['Authorization', 'Bearer fixture-token'],
      ['Authorization', 'Bearer fixture-token'],
    ])

    expect(client.rpc).toHaveBeenLastCalledWith('set_privacy', {
      policy_version: 2,
      allow_telemetry: false,
    })
  })

  it('pins the proxy call to the checked account too', async () => {
    const { service, client } = connection()
    await service.collect(record.id, record.playedAt, telemetryOf(record))

    expect(client.functions.invoke).toHaveBeenCalledWith(
      'game-telemetry',
      expect.objectContaining({
        headers: { Authorization: 'Bearer fixture-token' },
      }),
    )
  })

  it('rejects a different account or guest before any request can be issued', async () => {
    for (const fixture of [connection('two'), connection('one', true)]) {
      await expect(fixture.service.load()).rejects.toThrow('Privacy account changed')
      await expect(fixture.service.save(true)).rejects.toThrow('Privacy account changed')

      await expect(fixture.service.collect(record.id, record.playedAt, telemetryOf(record))).rejects.toThrow(
        'Privacy account changed',
      )

      expect(fixture.client.rpc).not.toHaveBeenCalled()
      expect(fixture.client.functions.invoke).not.toHaveBeenCalled()
    }
  })
})
