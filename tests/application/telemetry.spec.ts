import { describe, expect, it, vi } from 'vitest'
import { telemetryOf, telemetrySchema } from '@/application/cloud/privacy'
import { HERO_IDS, ITEM_IDS, SYNERGY_IDS } from '@/content/ids'
import { createProfile } from '@/domain/profile/Profile'
import { handleTelemetry } from '../../supabase/functions/_shared/handleTelemetry'
import { deleteTelemetry } from '../../supabase/functions/_shared/deleteTelemetry'
import { duelMatch, play, WIN } from '../helpers/profile'

const { record } = play(createProfile('2026-09-29T12:00:00Z'), duelMatch(WIN))

const request = () => ({
  policyVersion: 2,
  matchId: record.id,
  finishedAt: record.playedAt,
  payload: telemetryOf(record),
})

const reservation = {
  analyticsId: 'private-pseudonym',
  eventId: 'event-uuid',
}

describe('PostHog gameplay telemetry', () => {
  it('keeps only own gameplay data, without replay seeds, names or opponent boards', () => {
    const payload = telemetryOf({
      ...record,
      roundLineups: [[[['archer', 2, 'top', ['boots']]], [['rogue', 3, 'bot', ['staff']]]]],
      history: ['win'],
    })

    const json = JSON.stringify(payload)
    expect(json).not.toContain('Rival')
    expect(json).not.toContain('giant')
    expect(json).not.toContain('rogue')
    expect(json).not.toContain('staff')
    expect(json).not.toContain('opponent')
    expect(json).not.toContain('playedAt')
    expect(json).not.toContain('replays')

    expect(payload.roundBoards[0]?.lineup).toEqual([
      {
        heroId: 'archer',
        stars: 2,
        lane: 'top',
        items: ['boots'],
      },
    ])
  })

  it('supports all current hero, item and synergy ids at the ingestion boundary', () => {
    const base = telemetryOf(record)
    for (const heroId of HERO_IDS) {
      for (const item of ITEM_IDS) {
        expect(
          telemetrySchema.safeParse({
            ...base,
            lineup: [
              {
                heroId,
                stars: 1,
                lane: 'top',
                items: [item],
              },
            ],
            synergies: [...SYNERGY_IDS],
          }).success,
        ).toBe(true)
      }
    }
  })

  it('names the faction steps of each round and of the final lineup, and tells ghost duels apart', () => {
    const payload = telemetryOf({
      ...record,
      duel: {
        opponentName: null,
        ranked: true,
        ghost: true,
      },
      lineup: [
        {
          heroId: 'spearman',
          stars: 1,
          lane: 'top',
          items: [],
        },
        {
          heroId: 'herald',
          stars: 1,
          lane: 'top',
          items: [],
        },
        {
          heroId: 'sniper',
          stars: 1,
          lane: 'bot',
          items: [],
        },
      ],
      roundLineups: [
        [
          [
            ['archer', 1, 'top', []],
            ['warden', 1, 'top', []],
            ['giant', 1, 'top', []],
          ],
          [],
        ],
      ],
      history: ['win'],
    })

    expect(payload.kind).toBe('ghost')
    expect(payload.factions).toEqual(['legion:2'])
    expect(payload.roundBoards[0]?.factions).toEqual(['wildkin:3'])
  })

  it('drops unexpected personal fields on the server, including inside nested objects', async () => {
    const input = request()
    const send = vi.fn(async () => ({ ok: true }))
    await handleTelemetry(
      {
        ...input,
        userId: 'account-secret',
        payload: {
          ...input.payload,
          email: 'private@example.com',
          $ip: '8.8.8.8',
          lineup: input.payload.lineup.map((h) => ({
            ...h,
            nickname: 'private-name',
          })),
        },
      },
      {
        reserve: async () => reservation,
        send,
      },
    )

    const sent = JSON.stringify(send.mock.calls)
    expect(sent).not.toContain('account-secret')
    expect(sent).not.toContain('private@example.com')
    expect(sent).not.toContain('private-name')
    expect(sent).not.toContain('8.8.8.8')

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'game_match_finished',
        properties: expect.objectContaining({
          distinct_id: reservation.analyticsId,
          $geoip_disable: true,
          $ip: null,
        }),
      }),
    )
  })

  it('does not contact PostHog without a server reservation (refused, revoked, duplicate or stale)', async () => {
    const send = vi.fn()
    expect(
      await handleTelemetry(request(), {
        reserve: async () => null,
        send,
      }),
    ).toBe(204)

    expect(send).not.toHaveBeenCalled()
  })

  it('rejects invalid and oversized payloads before requesting consent or contacting PostHog', async () => {
    const reserve = vi.fn()
    const send = vi.fn()
    const input = request()
    for (const payload of [
      {
        ...input.payload,
        mode: 'unknown',
      },
      {
        ...input.payload,
        balance: 'private name',
      },
      {
        ...input.payload,
        lineup: Array(31).fill(input.payload.lineup[0]),
      },
      {
        ...input.payload,
        rounds: -1,
      },
    ]) {
      expect(
        await handleTelemetry(
          {
            ...input,
            payload,
          },
          {
            reserve,
            send,
          },
        ),
      ).toBe(400)
    }

    expect(reserve).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('reports capture failure without mistaking it for a successful send', async () => {
    expect(
      await handleTelemetry(request(), {
        reserve: async () => reservation,
        send: async () => ({ ok: false }),
      }),
    ).toBe(502)
  })

  it('keeps deletion jobs when PostHog returns 202 with errors or has not found the person yet', async () => {
    const acknowledge = vi.fn()
    for (const body of [
      {
        deletion_errors: ['failed'],
        persons_queued_for_deletion: 1,
        events_queued_for_deletion: true,
      },
      {
        persons_queued_for_deletion: 0,
        events_queued_for_deletion: true,
      },
    ]) {
      expect(
        await deleteTelemetry([{ analytics_id: 'old' }], {
          remove: async () => ({
            ok: true,
            json: async () => body,
          }),
          acknowledge,
        }),
      ).toBe(0)
    }

    expect(acknowledge).not.toHaveBeenCalled()
  })

  it('acknowledges jobs only after PostHog queues both person and event deletion', async () => {
    const acknowledge = vi.fn(async () => undefined)
    for (const result of [{ persons_queued_for_deletion: 1 }, { persons_deleted: 1 }]) {
      expect(
        await deleteTelemetry([{ analytics_id: 'old' }], {
          remove: async () => ({
            ok: true,
            json: async () => ({
              deletion_errors: [],
              ...result,
              events_queued_for_deletion: true,
            }),
          }),
          acknowledge,
        }),
      ).toBe(1)
    }

    expect(acknowledge).toHaveBeenCalledWith('old')
  })
})
