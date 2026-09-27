import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { sequentialIds } from '@/core/ids'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { createRng } from '@/core/random/rng'
import { headlessResolver } from '@/simulation/BattleSimulation'

describe('Match', () => {
  it('refuses to start a battle with an empty board', () => {
    const match = createMatch({
      seed: 'empty',
      ids: sequentialIds(),
    })

    expect(match.startBattle()._unsafeUnwrapErr().code).toBe('emptyBoard')
    expect(match.phase).toBe('planning')
  })

  it('starts with an empty board when the planning timer forces it', () => {
    const match = createMatch({
      seed: 'forced',
      ids: sequentialIds(),
    })

    expect(match.startBattle({ allowEmptyBoard: true }).isOk()).toBe(true)
    expect(match.phase).toBe('battle')
  })

  it('walks through planning, battle and summary', () => {
    const match = createMatch({
      seed: 'flow',
      ids: sequentialIds(),
    })

    new GreedyCoach().playTurn(match.human, {
      round: 1,
      rng: createRng('coach'),
    })

    const goldBefore = match.human.wallet.gold

    const setup = match.startBattle()._unsafeUnwrap()
    expect(match.phase).toBe('battle')
    const summary = match.finishBattle(headlessResolver.resolve(setup))._unsafeUnwrap()

    expect(match.phase).toBe('summary')
    expect(match.human.wallet.gold).toBe(goldBefore + summary.income[0].total)
    expect(match.nextRound().isOk()).toBe(true)
    expect(match.round).toBe(2)
    expect(match.phase).toBe('planning')
  })

  it('always finishes within the round limit', () => {
    const match = createMatch({
      seed: 'limit',
      ids: sequentialIds(),
    })

    const coach = new GreedyCoach()
    const rng = createRng('limit-coach')
    while (match.phase !== 'finished') {
      coach.playTurn(match.human, {
        round: match.round,
        rng,
      })

      match.finishBattle(headlessResolver.resolve(match.startBattle()._unsafeUnwrap()))
      match.nextRound()
    }

    expect(match.result).not.toBeNull()
    expect(match.round).toBeLessThanOrEqual(20)
  })
})
