import type { SimulationContext, System } from '../SimulationContext'

export class SpinSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number): void {
    for (const unit of this.ctx.queries.spinners) {
      const spin = unit.spin
      spin.remaining -= dt
      spin.tickTimer -= dt
      if (spin.tickTimer <= 0) {
        spin.tickTimer += spin.tick
        this.ctx.combat.splash(unit, unit.position, spin.radius, spin.damage, 'magical')
      }
      if (spin.remaining <= 0) this.ctx.world.removeComponent(unit, 'spin')
    }
  }
}
