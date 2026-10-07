import { describe, expect, it } from 'vitest'
import { createMatch, restoreMatch } from '@/application/createMatch'
import { arbitrateDuel } from '@/application/social/arbiter'
import { arbitrateGhost } from '@/application/social/ghostArbiter'
import { parseGhostBoard } from '@/application/social/ghosts'
import { continueGhostBoard } from '@/application/social/ghostContinuation'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { MODE_IDS } from '@/content/ids'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import type { PlayerState } from '@/domain/player/Player'
import { createProfile } from '@/domain/profile/Profile'
import { rankedRatingChange } from '@/domain/profile/progression'
import { parseProfile, serializeProfile } from '@/application/persistence/profileSnapshot'
import { headlessResolver } from '@/simulation/BattleSimulation'
import { DRAW, LOSS, WIN, duelMatch, play } from '../helpers/profile'

const emptyBoard = () => createMatch({ mode: 'oneLane' }).human.snapshot()

describe('recorded ghost boards', () => {
  it('keeps orders and items, separates hero ids and still validates board structure', () => {
    const original = emptyBoard()

    const board = {
      ...original,
      roster: {
        ...original.roster,
        lanes: {
          top: [],
          mid: [
            {
              uid: 'shared',
              heroId: 'spearman',
              stars: 1,
              items: ['chainmail'],
            },
          ],
          bot: [],
        },
        stances: { mid: 'hold' },
      },
    }

    const ghost = parseGhostBoard(board, 'oneLane')
    expect(ghost?.roster.stances).toEqual({ mid: 'hold' })
    expect(ghost?.roster.lanes.mid[0]?.uid).toBe('ghost:0')
    expect(ghost?.roster.lanes.mid[0]?.items).toEqual(['chainmail'])
    expect(board.roster.lanes.mid[0]?.uid).toBe('shared')

    expect(
      parseGhostBoard(
        {
          ...board,
          level: 99,
        },
        'oneLane',
      ),
    ).toBeNull()

    expect(parseGhostBoard(null, 'oneLane')).toBeNull()
  })

  it('exempts only the ghost economy and rejects forged human gold', () => {
    const board = emptyBoard()

    const boards = [
      {
        round: 1,
        side: 0 as const,
        board,
      },
      {
        round: 1,
        side: 1 as const,
        board: {
          ...board,
          gold: 99,
        },
      },
    ]

    expect(
      arbitrateDuel({
        mode: 'oneLane',
        seed: 'economy',
        boards,
      }),
    ).toMatchObject({
      kind: 'invalidBoard',
      offender: 1,
    })

    expect(
      arbitrateDuel({
        mode: 'oneLane',
        seed: 'economy',
        boards,
        ghost: true,
      }),
    ).toMatchObject({
      kind: 'incomplete',
      rounds: 1,
    })

    expect(
      arbitrateGhost({
        mode: 'oneLane',
        seed: 'economy',
        boards: [
          {
            ...board,
            gold: 99,
          },
        ],
        ghostBoards: [board],
      }).side,
    ).toBe(1)
  })

  it('does not accept a claimed victory before the match is played out', () => {
    const result = arbitrateGhost({
      mode: 'oneLane',
      seed: 'premature',
      boards: [],
      ghostBoards: [emptyBoard()],
    })

    expect(result.side).toBe(1)

    expect(result.verdict).toMatchObject({
      kind: 'incomplete',
      rounds: 0,
    })
  })

  it.each(MODE_IDS)(
    'replays %s through the recording and bot continuation, including a reload',
    { timeout: 60_000 },
    (mode) => {
      const seed = 'ghost-integration'

      const match = createMatch({
        mode,
        seed: 'local',
        ids: sequentialIds('human'),
        link: {
          seed,
          side: 0,
        },
      })

      const coach = new GreedyCoach()
      const rng = createRng('ghost-human')
      const ghostBoards: PlayerState[] = []
      const boards: PlayerState[] = []
      let continued = false

      while (match.phase === 'planning') {
        coach.playTurn(match.human, {
          round: match.round,
          rng,
        })

        boards.push(match.human.snapshot())

        if (match.round <= 3) {
          ghostBoards.push(match.human.snapshot())
        }

        const raw = ghostBoards[Math.min(match.round - 1, ghostBoards.length - 1)]

        const opponent =
          match.round > ghostBoards.length
            ? continueGhostBoard(match.opponent.snapshot(), match.mode, seed, match.round)
            : parseGhostBoard(raw, mode)!

        if (match.round > ghostBoards.length) {
          continued = true
          const restored = restoreMatch(match.snapshot(), { ids: sequentialIds('restored') })
          expect(
            continueGhostBoard(restored.opponent.snapshot(), restored.mode, seed, restored.round),
          ).toEqual(opponent)
        }

        match.receiveOpponent(opponent, { trusted: true })._unsafeUnwrap()
        const setup = match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()
        match.finishBattle(headlessResolver.resolve(setup))._unsafeUnwrap()
        match.nextRound()
      }

      const replay = arbitrateGhost({
        mode,
        seed,
        boards,
        ghostBoards,
      })

      expect(replay.verdict).toEqual({
        kind: 'decided',
        result: match.result,
        rounds: match.stats.rounds,
      })

      expect(replay.side).toBe(match.result!.winner ?? -1)
      expect(continued).toBe(true)
    },
  )

  it('develops the last roster without creating gold and does not mutate its saved anchor', () => {
    const previous = {
      ...emptyBoard(),
      gold: 30,
    }

    const saved = structuredClone(previous)
    const next = continueGhostBoard(previous, 'oneLane', 'development', 4)
    expect(previous).toEqual(saved)
    expect(next.roster.lanes.mid.length).toBeGreaterThan(0)
    expect(next.ledger.goldSpent).toBeGreaterThan(previous.ledger.goldSpent)
    expect(next.gold + next.ledger.goldSpent - next.ledger.goldFromSales).toBe(30)
    expect(continueGhostBoard(saved, 'oneLane', 'development', 4)).toEqual(next)
  })
})

describe('ghost rating and persistence', () => {
  it('rounds both wins and losses like the server and preserves the ghost flag through a save', () => {
    expect(rankedRatingChange(WIN, 500, 500, true)).toBe(13)
    expect(rankedRatingChange(LOSS, 500, 500, true)).toBe(-13)
    expect(rankedRatingChange(DRAW, 500, 500, true)).toBe(0)
    const finished = duelMatch(WIN)

    const { profile, record } = play(createProfile('2026-10-07T12:00:00Z'), {
      ...finished,
      duel: {
        ...finished.duel!,
        ghost: true,
      },
    })

    expect(record.ratingAfter).toBe(13)
    expect(parseProfile(serializeProfile(profile))?.recent[0]?.duel?.ghost).toBe(true)
  })
})
