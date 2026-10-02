import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '@/application/cloud/database'
import { SupabaseLeaderboard } from '@/application/cloud/SupabaseLeaderboard'

const COACH = '71000000-0000-4000-8000-000000000001'

const row = {
  id: COACH,
  position: 1,
  name: 'Alpha',
  avatar: 'archer',
  photo: 'https://example.com/photo.png',
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
