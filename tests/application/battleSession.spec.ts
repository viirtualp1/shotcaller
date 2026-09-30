import { describe, expect, it } from 'vitest'
import { BattleSession } from '@/application/BattleSession'
import { BATTLE } from '@/content/rules'
import { demoBattle } from '@/domain/demo/demoBattle'
import { BattleSimulation } from '@/simulation/BattleSimulation'

describe('battle catch-up after a suspended tab', () => {
  it('limits work per frame and reaches the same outcome without dropping simulation steps', () => {
    const setup = demoBattle('threeLanes', 'catch-up')
    const session = new BattleSession(new BattleSimulation(setup))
    session.catchUp(BATTLE.duration, 8)
    expect(session.simulation.elapsed).toBeCloseTo(BATTLE.step * 8)
    expect(session.isOver).toBe(false)

    while (!session.isOver) {
      session.catchUp(BATTLE.duration + BATTLE.step, 8)
    }

    const reference = new BattleSimulation(setup)
    expect(session.simulation.outcome()).toEqual(reference.runToEnd())
    session.dispose()
    reference.dispose()
  })
})
