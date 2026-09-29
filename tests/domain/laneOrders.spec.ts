import { describe, expect, it } from 'vitest'
import { createMatch, restoreMatch } from '@/application/createMatch'
import { parseRemoteBoard, parseSnapshot, serializeSnapshot } from '@/application/persistence/snapshot'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { headlessResolver } from '@/simulation/BattleSimulation'

function readyMatch() {
  const match = createMatch({
    seed: 'orders',
    ids: sequentialIds(),
  })

  new GreedyCoach().playTurn(match.human, {
    round: 1,
    rng: createRng('orders-coach'),
  })

  return match
}

describe('lane orders', () => {
  it('go into the battle and stay until changed', () => {
    const match = readyMatch()
    match.human.setStance('mid', 'hold')
    match.human.setStance('top', 'push')
    match.human.setStance('top', null)

    const setup = match.startBattle()._unsafeUnwrap()
    expect(setup.stances?.[match.side]).toEqual({ mid: 'hold' })
    expect(match.human.roster.stances()).toEqual({ mid: 'hold' })
  })

  it('are kept by the save, the replay tape and the duel board', () => {
    const match = readyMatch()
    match.human.setStance('bot', 'group')

    const restored = restoreMatch(parseSnapshot(serializeSnapshot(match.snapshot()))!, {
      ids: sequentialIds('restored'),
    })

    expect(restored.human.roster.stances()).toEqual({ bot: 'group' })
    expect(parseRemoteBoard(match.human.snapshot(), 'threeLanes')?.roster.stances).toEqual({ bot: 'group' })

    const setup = match.startBattle()._unsafeUnwrap()
    match.finishBattle(headlessResolver.resolve(setup))
    expect(match.stats.replays[0]?.stances?.[0]).toEqual({ bot: 'group' })
  })

  it('reads boards and saves from before orders as lanes left to their heroes', () => {
    const board = JSON.parse(JSON.stringify(readyMatch().human.snapshot()))
    delete board.roster.stances

    expect(parseRemoteBoard(board, 'threeLanes')?.roster.stances).toEqual({})
  })

  it('only go to lanes the mode has', () => {
    const match = createMatch({
      seed: 'two',
      ids: sequentialIds(),
      mode: 'twoLanes',
    })

    expect(match.human.setStance('mid', 'hold')._unsafeUnwrapErr().code).toBe('laneClosed')
  })
})
