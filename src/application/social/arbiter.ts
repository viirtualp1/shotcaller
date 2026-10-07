import { opponentOf, type ModeId, type TeamId } from '@/content/ids'
import { sequentialIds } from '@/core/ids'
import type { MatchResult } from '@/domain/match/judge'
import type { PlayerState } from '@/domain/player/Player'
import { affordableBoard } from '@/domain/player/boardValue'
import { headlessResolver } from '@/simulation/BattleSimulation'
import { parseGhostBoard } from './ghosts'
import { continueGhostBoard } from './ghostContinuation'
import { createMatch } from '../createMatch'
import { parseRemoteBoard } from '../persistence/snapshot'

/** A board one side of a duel sent for one round, as the server kept it. */
export interface RecordedBoard {
  readonly round: number
  readonly side: TeamId
  readonly board: unknown
}

export interface DuelRecord {
  readonly mode: ModeId
  readonly seed: string
  readonly boards: readonly RecordedBoard[]
  /** The guest is a ghost: its boards were recorded in another match and only need to be boards at all. */
  readonly ghost?: boolean
  readonly ghostRounds?: number
}

/**
 * What a replay of a duel shows:
 * - `decided`: the match ended in this result, as both devices should have seen it; `winner` is null for a draw;
 * - `invalidBoard`: one side sent a board the rules do not allow, and the other side wins;
 * - `incomplete`: the boards stop before the match ends, or both sides broke the rules; nobody can be blamed.
 */
export type DuelVerdict =
  | { readonly kind: 'decided'; readonly result: MatchResult; readonly rounds: number }
  | { readonly kind: 'invalidBoard'; readonly offender: TeamId; readonly round: number }
  | { readonly kind: 'incomplete'; readonly rounds: number }

const heroUids = (board: PlayerState) => [
  ...board.roster.bench.map((hero) => hero.uid),
  ...Object.values(board.roster.lanes).flatMap((lane) => lane.map((hero) => hero.uid)),
]

/**
 * Replays a duel from the boards both sides sent, the way both devices fought it: the host's view, round by round,
 * with every board checked against the rules and the previous round as the receiving device checks it.
 */
export function arbitrateDuel(record: DuelRecord): DuelVerdict {
  const match = createMatch({
    seed: `arbiter:${record.seed}`,
    ids: sequentialIds('arbiter'),
    mode: record.mode,
    link: {
      seed: record.seed,
      side: 0,
    },
  })

  const boardOf = (round: number, side: TeamId) =>
    record.boards.find((entry) => entry.round === round && entry.side === side)?.board

  while (match.phase === 'planning') {
    const round = match.round
    const rawHost = boardOf(round, 0)
    const rawGuest = boardOf(round, 1)

    if (rawHost === undefined || rawGuest === undefined) {
      return {
        kind: 'incomplete',
        rounds: round - 1,
      }
    }

    const host = parseRemoteBoard(rawHost, record.mode)

    const recordedGuest = record.ghost
      ? parseGhostBoard(rawGuest, record.mode)
      : parseRemoteBoard(rawGuest, record.mode)

    const guest =
      recordedGuest && record.ghost && round > (record.ghostRounds ?? Infinity)
        ? continueGhostBoard(match.opponent.snapshot(), record.mode, record.seed, round)
        : recordedGuest

    const hostFair = host !== null && affordableBoard(host, match.human.snapshot(), record.mode, round)
    const guestFair = guest !== null && (record.ghost || match.acceptsOpponent(guest))

    const shared =
      host !== null && guest !== null && heroUids(guest).some((uid) => heroUids(host).includes(uid))

    if (!hostFair || !guestFair || shared) {
      if (hostFair === guestFair && !(shared && record.ghost)) {
        return {
          kind: 'incomplete',
          rounds: round - 1,
        }
      }

      return {
        kind: 'invalidBoard',
        offender: shared && record.ghost ? 0 : hostFair ? 1 : 0,
        round,
      }
    }

    match.human.restore(host)
    match.receiveOpponent(guest, { trusted: record.ghost })._unsafeUnwrap()

    const setup = match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()
    match.finishBattle(headlessResolver.resolve(setup))._unsafeUnwrap()

    /* A finished match has no next round; the loop then ends. */
    match.nextRound()
  }

  const result = match.result
  if (!result) {
    return {
      kind: 'incomplete',
      rounds: match.stats.rounds,
    }
  }

  return {
    kind: 'decided',
    result,
    rounds: match.stats.rounds,
  }
}

/** The side that won by the verdict, -1 for a draw, or null when the replay cannot decide. */
export function winningSide(verdict: DuelVerdict): TeamId | -1 | null {
  switch (verdict.kind) {
    case 'decided':
      return verdict.result.winner ?? -1
    case 'invalidBoard':
      return opponentOf(verdict.offender)
    case 'incomplete':
      return null
  }
}
