import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '@/application/cloud/database'
import { SupabaseLeaderboard } from '@/application/cloud/SupabaseLeaderboard'
import { SupabaseFriends } from '@/application/cloud/SupabaseFriends'

const COACH = '71000000-0000-4000-8000-000000000001'

const row = {
  id: COACH,
  position: 1,
  name: 'Alpha',
  avatar: 'archer',
  photo: 'https://lh3.googleusercontent.com/a/photo',
  rating: 1500,
}

function connection(data: unknown, error: unknown = null) {
  const rpc = vi.fn(async () => ({
    data,
    error,
  }))

  const client = { rpc } as unknown as SupabaseClient<Database>

  return {
    client,
    rpc,
  }
}

describe('public MMR leaderboard', () => {
  it('requests a ranked coach by ID without reading their friend code', async () => {
    const { client, rpc } = connection('sent')
    expect(await new SupabaseFriends(client, 'owner').requestLeaderboard(COACH)).toBe('sent')
    expect(rpc).toHaveBeenCalledExactlyOnceWith('request_leaderboard_friend', { other: COACH })
  })

  it('validates friend request results and propagates transport errors', async () => {
    const unknown = connection('unexpected')
    await expect(new SupabaseFriends(unknown.client, 'owner').requestLeaderboard(COACH)).rejects.toThrow(
      'Unexpected friend request result',
    )

    const offline = connection(null, new Error('offline'))
    await expect(new SupabaseFriends(offline.client, 'owner').requestLeaderboard(COACH)).rejects.toThrow(
      'offline',
    )
  })

  it('fetches only the selected mode and strips unexpected private fields', async () => {
    const { client, rpc } = connection([
      {
        ...row,
        email: 'private@example.invalid',
        friend_code: 'SECRET',
        recent: [{ id: 'private-match' }],
      },
    ])

    const result = await new SupabaseLeaderboard(client).read('oneLane')

    expect(rpc).toHaveBeenCalledWith('mmr_leaderboard', { game_mode: 'oneLane' })
    expect(result).toEqual([row])
  })

  it('keeps a missing or unsafe picture from being displayed', async () => {
    const { client } = connection([
      {
        ...row,
        photo: 'javascript:alert(1)',
      },
    ])

    expect((await new SupabaseLeaderboard(client).read('threeLanes'))[0]!.photo).toBeNull()
  })

  it('rejects malformed ratings and oversized responses rather than showing an invalid ladder', async () => {
    const invalid = connection([
      {
        ...row,
        rating: -1,
      },
    ])

    const oversized = connection(Array.from({ length: 101 }, () => row))
    await expect(new SupabaseLeaderboard(invalid.client).read('twoLanes')).rejects.toThrow()
    await expect(new SupabaseLeaderboard(oversized.client).read('twoLanes')).rejects.toThrow()
  })

  it('reports transport failures so the player can retry', async () => {
    const { client } = connection(null, new Error('offline'))
    await expect(new SupabaseLeaderboard(client).read('twoLanes')).rejects.toThrow('offline')
  })
})
