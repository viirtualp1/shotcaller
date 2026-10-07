import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { arbitrateDuel, winningSide, type RecordedBoard } from '@/application/social/arbiter'
import type { ModeId, TeamId } from '@/content/ids'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { headlessResolver } from '@/simulation/BattleSimulation'

/* A whole duel is played twice, once by the two devices and once by the arbiter. */
const FULL_DUEL_TIMEOUT = 60_000

function device(seed: string, side: TeamId, mode: ModeId) {
  return {
    match: createMatch({
      seed: `${seed}:${side}`,
      ids: sequentialIds(`p${side}`),
      mode,
      link: {
        seed,
        side,
      },
    }),
    coach: new GreedyCoach(),
    rng: createRng(`${seed}:coach:${side}`),
  }
}

/** Two devices play a duel to the end; returns what each saw and every board the server kept. */
function playDuel(seed: string, mode: ModeId, maxRounds = Infinity) {
  const host = device(seed, 0, mode)
  const guest = device(seed, 1, mode)
  const boards: RecordedBoard[] = []

  while (host.match.phase === 'planning' && host.match.round <= maxRounds) {
    for (const { match, coach, rng } of [host, guest]) {
      coach.playTurn(match.human, {
        round: match.round,
        rng,
      })
    }

    const round = host.match.round
    const hostBoard = host.match.human.snapshot()
    const guestBoard = guest.match.human.snapshot()
    boards.push(
      {
        round,
        side: 0,
        board: hostBoard,
      },
      {
        round,
        side: 1,
        board: guestBoard,
      },
    )

    host.match.receiveOpponent(guestBoard)._unsafeUnwrap()
    guest.match.receiveOpponent(hostBoard)._unsafeUnwrap()

    for (const { match } of [host, guest]) {
      match.finishBattle(
        headlessResolver.resolve(match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()),
      )

      if (match.phase === 'summary') {
        match.nextRound()._unsafeUnwrap()
      }
    }
  }

  return {
    host: host.match,
    guest: guest.match,
    boards,
  }
}

describe('duel arbiter', () => {
  it('replays a duel to the result both devices saw', { timeout: FULL_DUEL_TIMEOUT }, () => {
    const { host, guest, boards } = playDuel('arbiter-duel', 'oneLane')

    const verdict = arbitrateDuel({
      mode: 'oneLane',
      seed: 'arbiter-duel',
      boards,
    })

    expect(host.result).not.toBeNull()

    expect(verdict).toEqual({
      kind: 'decided',
      result: host.result,
      rounds: host.stats.rounds,
    })

    expect(winningSide(verdict)).toBe(host.result!.winner ?? -1)

    /* The guest saw the same match from the other side. */
    expect(guest.result!.winner).toBe(host.result!.winner === null ? null : 1 - host.result!.winner)
  })

  it('cannot decide a duel whose boards stop before the end', () => {
    const { boards } = playDuel('arbiter-short', 'oneLane', 2)

    const verdict = arbitrateDuel({
      mode: 'oneLane',
      seed: 'arbiter-short',
      boards,
    })

    expect(verdict).toEqual({
      kind: 'incomplete',
      rounds: 2,
    })

    expect(winningSide(verdict)).toBeNull()
  })

  it('gives the duel to the side that kept to the rules', () => {
    const { boards } = playDuel('arbiter-cheat', 'oneLane', 3)

    const forged = boards.map((entry) =>
      entry.round === 2 && entry.side === 1
        ? {
            ...entry,
            board: {
              ...(entry.board as object),
              gold: 99,
            },
          }
        : entry,
    )

    const verdict = arbitrateDuel({
      mode: 'oneLane',
      seed: 'arbiter-cheat',
      boards: forged,
    })

    expect(verdict).toEqual({
      kind: 'invalidBoard',
      offender: 1,
      round: 2,
    })

    expect(winningSide(verdict)).toBe(0)
  })
})
