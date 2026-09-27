import { BATTLE } from '@/content/rules'
import { FixedTimestep } from '@/core/time/FixedTimestep'
import type { BattleOutcome } from '@/domain/battle/contracts'
import type { BattleSimulation } from '@/simulation/BattleSimulation'

export class BattleSession {
  private readonly timestep = new FixedTimestep(BATTLE.step)

  constructor(readonly simulation: BattleSimulation) {}

  get isOver(): boolean {
    return this.simulation.isOver
  }

  advance(realSeconds: number, speed: number): void {
    this.timestep.advance(realSeconds, speed, (dt) => {
      this.simulation.step(dt)
      return !this.simulation.isOver
    })
  }

  finish(): BattleOutcome {
    return this.simulation.runToEnd()
  }

  dispose(): void {
    this.simulation.dispose()
  }
}
