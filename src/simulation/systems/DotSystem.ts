import type { SimulationContext, System } from '../SimulationContext'

export class DotSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number) {
    const { world, combat, queries } = this.ctx
    for (const unit of queries.poisoned) {
      const dot = unit.dot
      dot.remaining -= dt
      dot.tickTimer -= dt

      if (dot.tickTimer <= 0) {
        dot.tickTimer += dot.tick
        combat.dealDamage(dot.source, unit, dot.damage, 'magical')
      }

      if (dot.remaining <= 0) {
        world.removeComponent(unit, 'dot')
      }
    }

    for (const unit of queries.shielded) {
      const shield = unit.shield
      shield.remaining -= dt

      if (shield.remaining <= 0 || shield.amount <= 0) {
        world.removeComponent(unit, 'shield')
      }
    }
  }
}
