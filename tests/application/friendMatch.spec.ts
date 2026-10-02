import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/application/cloud/database'
import { SupabaseFriends } from '@/application/cloud/SupabaseFriends'
import { createProfile } from '@/domain/profile/Profile'
import { createMatch } from '@/application/createMatch'
import { liveMatchOf } from '@/domain/replay/live'
import { duelMatch, play, WIN } from '../helpers/profile'

const FRIEND = '22222222-2222-2222-2222-222222222222'

/** Answers `coach_match` the way the server does: the duel reduced to a flag. */
function friendsReturning(data: unknown) {
  const calls: unknown[] = []

  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push([name, args])

      return {
        data,
        error: null,
      }
    },
  } as unknown as SupabaseClient<Database>

  return {
    calls,
    friends: new SupabaseFriends(client, 'me'),
  }
}

describe('a friend match', () => {
  const { record } = play(createProfile('2026-09-29T10:00:00.000Z'), duelMatch(WIN))

  it('comes in full, without who the duel was against', async () => {
    const { calls, friends } = friendsReturning({
      ...record,
      duel: true,
    })

    const match = await friends.match(FRIEND, record.id)

    expect(calls).toEqual([
      [
        'coach_match',
        {
          friend: FRIEND,
          match_id: record.id,
        },
      ],
    ])

    expect(match).toEqual({
      ...record,
      duel: { opponentName: null },
    })
  })

  it('is a match against the computer when it was not a duel', async () => {
    const { friends } = friendsReturning({
      ...record,
      duel: false,
    })

    expect((await friends.match(FRIEND, record.id))?.duel).toBeNull()
  })

  it('is null when it is gone or unreadable', async () => {
    expect(await friendsReturning(null).friends.match(FRIEND, 'gone')).toBeNull()
    expect(await friendsReturning({ id: 'broken' }).friends.match(FRIEND, 'broken')).toBeNull()
  })
})

describe('live friend matches', () => {
  it('fetches and validates current battle progress through the friend-only RPC', async () => {
    const match = createMatch({ seed: 'live-service' })
    match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()
    const snapshot = liveMatchOf(match, 'standard', 'live-service', 12)
    const { calls, friends } = friendsReturning(snapshot)

    expect(await friends.liveMatch(FRIEND)).toEqual(snapshot)
    expect(calls).toEqual([['coach_live_match', { friend: FRIEND }]])
    expect(await friendsReturning(null).friends.liveMatch(FRIEND)).toBeNull()

    expect(
      await friendsReturning({
        ...snapshot,
        elapsed: -1,
      }).friends.liveMatch(FRIEND),
    ).toBeNull()
  })

  it('publishes only validated snapshots and sends null to stop sharing', async () => {
    const snapshot = liveMatchOf(createMatch({ seed: 'live-publish' }), 'standard', 'live-publish', 0)
    const { calls, friends } = friendsReturning(null)
    await friends.publishLiveMatch(snapshot)
    await friends.publishLiveMatch(null)

    expect(calls).toEqual([
      ['publish_live_match', { payload: snapshot }],
      ['publish_live_match', { payload: null }],
    ])

    await expect(
      friends.publishLiveMatch({
        ...snapshot,
        elapsed: -1,
      }),
    ).rejects.toThrow()

    expect(calls).toHaveLength(2)
  })
})
