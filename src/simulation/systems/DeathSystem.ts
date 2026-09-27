import { BATTLE } from '@/content/rules'
import { isHero } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

export const respawnDelay = (round: number): number =>
  Math.min(BATTLE.respawn.base + BATTLE.respawn.perRound * round, BATTLE.respawn.max)

export class DeathSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(): void {
    const { world, queries, setup, events } = this.ctx
    for (const unit of queries.units) {
      if (unit.health.current > 0) continue
      events.emit('died', { unit })
      if (isHero(unit)) {
        unit.respawnTimer = respawnDelay(setup.round)
        unit.targeting.target = null
        world.addComponent(unit, 'dead', true)
      } else if (unit.kind === 'structure') {
        world.addComponent(unit, 'dead', true)
      } else {
        world.remove(unit)
      }
    }
  }
}
