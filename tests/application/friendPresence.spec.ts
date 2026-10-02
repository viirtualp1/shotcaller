import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '@/application/cloud/database'
import { SupabaseFriends } from '@/application/cloud/SupabaseFriends'

const FRIEND = '22222222-2222-4222-8222-222222222222'
async function flush() {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve()
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('friends-only presence', () => {
  it('polls a small friend list, validates rows and stops after leaving', async () => {
    const rpc = vi.fn(() => ({
      abortSignal: async () => ({
        data: [
          {
            id: FRIEND,
            activity: 'duel',
            round: 3,
          },
          {
            id: 'malformed',
            activity: 'menu',
            round: null,
          },
          {
            id: FRIEND,
            activity: 'unknown',
            round: 1,
          },
        ],
        error: null,
      }),
    }))

    const client = {
      rpc,
      channel: vi.fn(),
    } as unknown as SupabaseClient<Database>

    const presence = new SupabaseFriends(client, 'owner').presence({
      activity: 'menu',
      round: null,
    })

    const changed = vi.fn()
    presence.onChange(changed)
    await flush()

    expect(changed).toHaveBeenCalledWith(
      new Map([
        [
          FRIEND,
          {
            activity: 'duel',
            round: 3,
          },
        ],
      ]),
    )

    expect(client.channel).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(rpc).toHaveBeenCalledTimes(2)

    presence.update({
      activity: 'match',
      round: 4,
    })

    await flush()

    expect(rpc).toHaveBeenLastCalledWith('friends_online', {
      doing: 'match',
      doing_round: 4,
    })

    presence.leave()
    await vi.advanceTimersByTimeAsync(90_000)
    expect(rpc).toHaveBeenCalledTimes(3)
  })

  it('ignores an outstanding response after leaving', async () => {
    let answer!: (result: { data: unknown[]; error: null }) => void

    const rpc = vi.fn(() => ({
      abortSignal: () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    }))

    const client = { rpc } as unknown as SupabaseClient<Database>

    const presence = new SupabaseFriends(client, 'owner').presence({
      activity: 'menu',
      round: null,
    })

    const changed = vi.fn()
    presence.onChange(changed)
    presence.leave()

    answer({
      data: [
        {
          id: FRIEND,
          activity: 'duel',
          round: 3,
        },
      ],
      error: null,
    })

    await flush()

    expect(changed).not.toHaveBeenCalled()
  })
})
