import { BATTLE } from '@/content/rules'
import { FixedTimestep } from '@/core/time/FixedTimestep'
import type { BattleSimulation } from '@/simulation/BattleSimulation'

export class BattleSession {
  private readonly timestep = new FixedTimestep(BATTLE.step)

  constructor(readonly simulation: BattleSimulation) {}

  get isOver() {
    return this.simulation.isOver
  }

  advance(realSeconds: number, speed: number) {
    this.timestep.advance(realSeconds, speed, (dt) => {
      this.simulation.step(dt)

      return !this.simulation.isOver
    })
  }

  /** Replay fixed steps toward the wall clock; a frame may limit catch-up work to keep input responsive. */
  catchUp(elapsed: number, maxSteps = Infinity) {
    let steps = 0
    while (!this.simulation.isOver && this.simulation.elapsed + BATTLE.step <= elapsed && steps < maxSteps) {
      steps++
      this.simulation.step()
    }
  }

  finish() {
    return this.simulation.runToEnd()
  }

  dispose() {
    this.simulation.dispose()
  }
}
