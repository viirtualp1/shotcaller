import { describe, expect, it } from 'vitest'
import { createMatch, restoreMatch } from '@/application/createMatch'
import { parseSnapshot, serializeSnapshot } from '@/application/persistence/snapshot'
import { opponentOf, type TeamId } from '@/content/ids'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { mirrorPair } from '@/domain/battle/mirror'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { headlessResolver } from '@/simulation/BattleSimulation'

const ROUNDS = 8
const LOOPBACK_TIMEOUT = 20_000

/** One player's device: its own match, shop stream and coach standing in for the person. */
function device(seed: string, side: TeamId) {
  return {
    match: createMatch({
      seed: `${seed}:${side}`,
      ids: sequentialIds(`p${side}`),
      link: {
        seed,
        side,
      },
    }),
    coach: new GreedyCoach(),
    rng: createRng(`${seed}:coach:${side}`),
  }
}

describe('online match', () => {
  it(
    'fights the same battles on both devices, each seeing its own side',
    { timeout: LOOPBACK_TIMEOUT },
    () => {
      const host = device('duel', 0)
      const guest = device('duel', 1)

      for (let round = 1; round <= ROUNDS && host.match.phase !== 'finished'; round++) {
        for (const { match, coach, rng } of [host, guest]) {
          coach.playTurn(match.human, {
            round: match.round,
            rng,
          })
        }

        host.match.receiveOpponent(guest.match.human.snapshot())._unsafeUnwrap()
        guest.match.receiveOpponent(host.match.human.snapshot())._unsafeUnwrap()

        const hostSetup = host.match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()
        const guestSetup = guest.match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()
        expect(guestSetup).toEqual(hostSetup)

        const hostSummary = host.match.finishBattle(headlessResolver.resolve(hostSetup))._unsafeUnwrap()
        const guestSummary = guest.match.finishBattle(headlessResolver.resolve(guestSetup))._unsafeUnwrap()

        expect(guest.match.structures).toEqual(mirrorPair(host.match.structures))
        expect(guestSummary.winner).toBe(hostSummary.winner === null ? null : opponentOf(hostSummary.winner))
        expect(guestSummary.heroKills).toEqual(mirrorPair(hostSummary.heroKills))

        if (host.match.phase === 'summary') {
          host.match.nextRound()._unsafeUnwrap()
          guest.match.nextRound()._unsafeUnwrap()
        }
      }

      expect(guest.match.phase).toBe(host.match.phase)
    },
  )

  it('waits for the other board before a battle starts', () => {
    const { match } = device('waiting', 0)

    expect(match.awaitingOpponent).toBe(true)
    expect(match.startBattle({ allowEmptyBoard: true })._unsafeUnwrapErr().code).toBe('opponentNotReady')
  })

  it('keeps its side and the received board through a save and load', () => {
    const guest = device('reload', 1)
    const host = device('reload', 0)
    guest.match.receiveOpponent(host.match.human.snapshot())._unsafeUnwrap()

    const restored = restoreMatch(parseSnapshot(serializeSnapshot(guest.match.snapshot()))!)

    expect(restored.side).toBe(1)
    expect(restored.awaitingOpponent).toBe(false)
    expect(restored.opponent.snapshot()).toEqual(host.match.human.snapshot())
  })
})
