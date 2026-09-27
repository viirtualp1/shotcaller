import type { SimulationContext, System } from '../SimulationContext'

export class StatusSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number): void {
    const { units, fighters, expiring } = this.ctx.queries
    for (const unit of units) {
      const status = unit.status
      status.stun = Math.max(0, status.stun - dt)
      status.root = Math.max(0, status.root - dt)
      status.slow = Math.max(0, status.slow - dt)
    }
    for (const fighter of fighters) fighter.attack.cooldown -= dt
    for (const unit of expiring) {
      unit.lifetime -= dt
      if (unit.lifetime <= 0) unit.health.current = 0
    }
  }
}
