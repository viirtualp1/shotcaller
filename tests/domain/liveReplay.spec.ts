import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { liveMatchSchema } from '@/application/social/liveMatch'
import { sequentialIds } from '@/core/ids'
import { fromSide } from '@/domain/battle/mirror'
import { liveMatchOf } from '@/domain/replay/live'
import { replayAvailability, replaySetup } from '@/domain/replay/setup'

describe('live viewing snapshots', () => {
  it('shares a pending battle before a match has finished, with both lineups and no opponent name', () => {
    const match = createMatch({
      seed: 'live',
      ids: sequentialIds(),
      mode: 'oneLane',
    })

    const setup = match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()
    const snapshot = liveMatchOf(match, 'standard', 'live-id', 12)
    const replay = replaySetup(snapshot.record, 1)

    expect(liveMatchSchema.safeParse(snapshot).success).toBe(true)

    expect(snapshot).toMatchObject({
      round: 1,
      phase: 'battle',
      elapsed: 12,
    })

    expect(snapshot.record.duel).toBeNull()
    expect(snapshot.record.replays).toHaveLength(1)
    expect(snapshot.record.roundLineups[0]?.[1].length).toBeGreaterThan(0)
    expect(replayAvailability(snapshot.record)).toBe('ready')

    expect(replay?.setup).toMatchObject({
      seed: setup.seed,
      structures: setup.structures,
    })

    expect(match.stats.rounds).toBe(0)
    expect(match.result).toBeNull()
  })

  it('keeps the guest side and both teams in the correct viewing order', () => {
    const match = createMatch({
      mode: 'oneLane',
      seed: 'guest-live',
      link: {
        seed: 'duel',
        side: 1,
      },
    })

    const board = createMatch({
      mode: 'oneLane',
      seed: 'board',
    }).opponent.snapshot()

    match.receiveOpponent(board)._unsafeUnwrap()
    const setup = match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()
    const snapshot = liveMatchOf(match, 'standard', 'guest', 4)

    expect(snapshot.record.side).toBe(1)
    expect(snapshot.record.replays[0]?.structures).toEqual(fromSide(1, setup.structures))
    expect(replaySetup(snapshot.record, 1)?.setup.structures).toEqual(setup.structures)
    expect(snapshot.record.roundLineups[0]?.[1].length).toBeGreaterThan(0)
  })

  it('does not fabricate a battle during first-round planning', () => {
    const match = createMatch({ seed: 'planning' })
    const snapshot = liveMatchOf(match, 'standard', 'waiting', 0)

    expect(snapshot.phase).toBe('planning')
    expect(snapshot.record.replays).toEqual([])
    expect(liveMatchSchema.safeParse(snapshot).success).toBe(true)
  })

  it.each([Infinity, -Infinity, NaN, -1])('rejects invalid battle time %s', (elapsed) => {
    const match = createMatch({ seed: 'invalid-time' })
    const snapshot = liveMatchOf(match, 'standard', 'waiting', 0)

    expect(
      liveMatchSchema.safeParse({
        ...snapshot,
        elapsed,
      }).success,
    ).toBe(false)
  })
})
