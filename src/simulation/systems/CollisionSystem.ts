import { BATTLE } from '@/content/rules'
import { clamp } from '@/core/math/vec2'
import type { SimulationContext, System } from '../SimulationContext'

const EDGE = 8

export class CollisionSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(): void {
    const { index, queries } = this.ctx
    index.sync()
    index.separate()
    for (const unit of queries.units) {
      unit.position.x = clamp(unit.position.x, EDGE, BATTLE.worldSize - EDGE)
      unit.position.y = clamp(unit.position.y, EDGE, BATTLE.worldSize - EDGE)
    }
  }
}
