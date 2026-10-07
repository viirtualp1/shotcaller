import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { SupabaseDuels } from '@/application/cloud/SupabaseDuels'
import type { Database } from '@/application/cloud/database'
import { DuelError } from '@/application/social/duels'

const coachId = '95000000-0000-4000-8000-000000000003'
const ghostId = '96000000-0000-4000-8000-000000000001'

const ghost = {
  id: ghostId,
  mode: 'oneLane',
  seed: 'server-seed',
  rating: 500,
  recordedRounds: 3,
  round: 1,
  status: 'active',
  result: null,
  endedBy: null,
  startedAt: '2026-10-07T12:00:00Z',
}

function connection(responses: Record<string, unknown>) {
  const requests: { name: string; body: unknown }[] = []

  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const name = url.pathname.split('/').at(-1)!
    requests.push({
      name,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    })

    return new Response(JSON.stringify(responses[name] ?? null), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  const client = createClient<Database>('https://db.example', 'test-key', {
    global: { fetch: fetcher },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return {
    service: new SupabaseDuels(client, coachId),
    requests,
  }
}

describe('ghost duel network adapter', () => {
  it('routes committed boards through the ghost endpoint after finding or recovering a ghost', async () => {
    const { service, requests } = connection({
      find_ghost: ghost,
      ghost_round: { board: 1 },
    })

    const entry = await service.findGhost('oneLane', 'balance')
    expect(entry?.duel).toMatchObject({
      ghost: true,
      ghostRounds: 3,
      ranked: true,
      host: coachId,
      seed: 'server-seed',
    })

    expect(await service.submitBoard(ghostId, 1, { mine: 1 })).toEqual({ board: 1 })

    expect(requests).toEqual([
      {
        name: 'find_ghost',
        body: {
          game_mode: 'oneLane',
          game_balance: 'balance',
        },
      },
      {
        name: 'ghost_round',
        body: {
          ghost: ghostId,
          board_round: 1,
          payload: { mine: 1 },
        },
      },
    ])
  })

  it('discovers the type of a pending report after a reload, including draws and explicit forfeits', async () => {
    const { service, requests } = connection({
      duels: [],
      ghost_duel: ghost,
      report_ghost: 0,
    })

    await service.report(ghostId, null, false)
    await service.forfeit(ghostId)

    expect(requests.filter((request) => request.name === 'report_ghost')).toEqual([
      {
        name: 'report_ghost',
        body: {
          ghost: ghostId,
          winning_side: -1,
        },
      },
    ])

    expect(requests.at(-1)).toEqual({
      name: 'forfeit_ghost',
      body: { ghost: ghostId },
    })

    expect(requests.some((request) => request.name === 'report_duel')).toBe(false)
  })

  it('offers active ghosts for recovery and rejects malformed server metadata', async () => {
    const { service } = connection({
      my_duels: [],
      active_ghost: ghost,
    })

    expect((await service.mine())[0]?.duel.ghost).toBe(true)

    const malformed = connection({
      find_ghost: {
        ...ghost,
        rating: -1,
      },
    })

    await expect(malformed.service.findGhost('oneLane', 'balance')).rejects.toBeInstanceOf(DuelError)
  })
})
