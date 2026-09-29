import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { parseProfile, serializeProfile } from '@/application/persistence/profileSnapshot'
import { BALANCE_FINGERPRINT } from '@/content/balance'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import type { BattleOutcome } from '@/domain/battle/contracts'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { replayAvailability, replayRoundHeroes, replaySetup } from '@/domain/replay/setup'
import { createProfile, matchRecordOf, type FinishedMatch } from '@/domain/profile/Profile'
import { headlessResolver } from '@/simulation/BattleSimulation'
import { finishedMatch as finished, play, WIN } from '../helpers/profile'

function comparable(outcome: BattleOutcome) {
  return {
    structures: outcome.structures,
    throneFell: outcome.throneFell,
    heroes: outcome.heroes.map(({ uid, ...hero }) => {
      void uid

      return hero
    }),
  }
}

describe('replays', () => {
  it('names the current balance with a stable fingerprint', () => {
    expect(BALANCE_FINGERPRINT).toMatch(/^[0-9a-f]{8}$/)
  })

  it('plays a saved round as the same fight', () => {
    const match = createMatch({
      seed: 'replay',
      ids: sequentialIds(),
    })

    new GreedyCoach().playTurn(match.human, {
      round: 1,
      rng: createRng('replay-coach'),
    })

    const setup = match.startBattle()._unsafeUnwrap()
    const outcome = headlessResolver.resolve(setup)
    match.finishBattle(outcome)

    const finished: FinishedMatch = {
      mode: match.mode,
      difficulty: 'standard',
      result: {
        winner: null,
        reason: 'roundLimit',
      },
      stats: match.stats,
      lineup: match.human.roster.lineup(),
      opponentLineup: match.opponent.roster.lineup(),
      side: match.side,
      towersDestroyed: 0,
      duel: null,
    }

    const record = matchRecordOf(finished, {
      id: 'replay-1',
      playedAt: '2026-09-29T12:00:00.000Z',
    })

    expect(record.balance).toBe(BALANCE_FINGERPRINT)
    expect(record.replays[0]?.seed).toBe(setup.seed)
    expect(record.replays[0]?.structures).toEqual(setup.structures)

    const replay = replaySetup(record, 1)
    expect(replay?.side).toBe(0)
    expect(comparable(headlessResolver.resolve(replay!.setup))).toEqual(comparable(outcome))
  })

  it('plays a guest’s match from their side of the same battle', () => {
    const empty = {
      top: 1,
      mid: 1,
      bot: 1,
      inner: 0,
      throne: 1,
    }

    const { record } = play(createProfile('2026-09-29T10:00:00.000Z'), {
      ...finished(WIN),
      side: 1,
      stats: {
        ...finished(WIN).stats,
        lineups: [[[['archer', 1, 'mid', []]], [['giant', 1, 'mid', []]]]],
        replays: [
          {
            seed: 'guest',
            structures: [empty, empty],
          },
        ],
      },
    })

    const replay = replaySetup(record, 1)

    expect(replay?.side).toBe(1)
    expect(replay?.setup.lineups[0].mid[0]?.heroId).toBe('giant')
    expect(replay?.setup.lineups[1].mid[0]?.heroId).toBe('archer')
    expect(replay?.setup.lineups[0].mid[0]?.uid).toBe('1:mid:0')
    expect(replay?.setup.lineups[1].mid[0]?.uid).toBe('0:mid:0')
    expect(replay?.setup.structures[0].top).toBe(1)

    const heroes = replayRoundHeroes(record, 1)
    expect(heroes?.find((hero) => hero.team === 0)).toMatchObject({
      heroId: 'archer',
      uid: '0:mid:0',
    })

    expect(heroes?.find((hero) => hero.team === 1)).toMatchObject({
      heroId: 'giant',
      uid: '1:mid:0',
    })
  })

  it('hides a replay once the balance no longer matches', () => {
    const { record } = play(createProfile('2026-09-29T10:00:00.000Z'), {
      ...finished(WIN),
      stats: {
        ...finished(WIN).stats,
        lineups: [[[], []]],
        replays: [
          {
            seed: 'old',
            structures: [
              {
                top: 1,
                mid: 1,
                bot: 1,
                inner: 0,
                throne: 1,
              },
              {
                top: 1,
                mid: 1,
                bot: 1,
                inner: 0,
                throne: 1,
              },
            ],
          },
        ],
      },
    })

    expect(replayAvailability(record)).toBe('ready')

    expect(
      replayAvailability({
        ...record,
        balance: 'gone',
      }),
    ).toBe('stale')

    expect(
      replaySetup(
        {
          ...record,
          balance: 'gone',
        },
        1,
      ),
    ).toBeNull()
  })

  it('reads a match saved before replays as not watchable', () => {
    const { profile } = play(createProfile('2026-09-29T10:00:00.000Z'), finished(WIN))
    const saved = JSON.parse(serializeProfile(profile))
    delete saved.profile.recent[0].balance
    delete saved.profile.recent[0].replays
    delete saved.profile.recent[0].side

    const parsed = parseProfile(JSON.stringify(saved))!
    expect(parsed.recent[0]).toMatchObject({
      side: 0,
      balance: '',
      replays: [],
    })

    expect(replayAvailability(parsed.recent[0]!)).toBe('missing')
  })
})
