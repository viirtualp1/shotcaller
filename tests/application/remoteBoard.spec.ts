import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { parseRemoteBoard } from '@/application/persistence/snapshot'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'

/** A real board, as the other device would send it after planning a round. */
function sentBoard() {
  const match = createMatch({
    seed: 'remote-board',
    ids: sequentialIds('r'),
  })

  new GreedyCoach().playTurn(match.human, {
    round: 1,
    rng: createRng('remote-board-coach'),
  })

  return JSON.parse(JSON.stringify(match.human.snapshot()))
}

describe('boards from the other player', () => {
  it('accepts a board the rules allow', () => {
    const board = sentBoard()

    expect(parseRemoteBoard(board, 'threeLanes')).toEqual(board)
  })

  it('rejects more heroes on the map than the level allows', () => {
    const board = sentBoard()
    const hero = board.roster.lanes.top[0] ?? board.roster.lanes.mid[0] ?? board.roster.lanes.bot[0]
    board.roster.lanes.bot = Array.from({ length: 6 }, (_, i) => ({
      ...hero,
      uid: `extra-${i}`,
    }))

    expect(parseRemoteBoard(board, 'threeLanes')).toBeNull()
  })

  it('rejects heroes that share an id', () => {
    const board = sentBoard()
    const hero = board.roster.lanes.top[0] ?? board.roster.lanes.mid[0] ?? board.roster.lanes.bot[0]
    board.roster.bench = [{ ...hero }]

    expect(parseRemoteBoard(board, 'threeLanes')).toBeNull()
  })

  it('rejects unknown heroes, impossible stars and junk', () => {
    const unknown = sentBoard()
    unknown.roster.bench = [
      {
        uid: 'x',
        heroId: 'dragon',
        stars: 1,
        items: [],
      },
    ]

    const stars = sentBoard()
    stars.roster.bench = [
      {
        uid: 'x',
        heroId: 'archer',
        stars: 7,
        items: [],
      },
    ]

    expect(parseRemoteBoard(unknown, 'threeLanes')).toBeNull()
    expect(parseRemoteBoard(stars, 'threeLanes')).toBeNull()
    expect(parseRemoteBoard([1, 2, 3], 'threeLanes')).toBeNull()
    expect(parseRemoteBoard(null, 'threeLanes')).toBeNull()
  })

  it('rejects oversized benches, stashes and gold', () => {
    const bench = sentBoard()
    bench.roster.bench = Array.from({ length: 9 }, (_, i) => ({
      uid: `b${i}`,
      heroId: 'archer',
      stars: 1,
      items: [],
    }))

    const gold = sentBoard()
    gold.gold = 1e9

    expect(parseRemoteBoard(bench, 'threeLanes')).toBeNull()
    expect(parseRemoteBoard(gold, 'threeLanes')).toBeNull()
  })
})
