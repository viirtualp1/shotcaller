import { enemiesAround } from '../abilities/selectors'
import type { SimulationContext, System } from '../SimulationContext'

const SLOW_REFRESH = 0.7

export class ZoneSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number) {
    for (const entity of this.ctx.queries.zones) {
      const zone = entity.zone
      zone.remaining -= dt
      zone.tickTimer -= dt

      if (zone.tickTimer <= 0) {
        zone.tickTimer += zone.tick

        for (const enemy of enemiesAround(this.ctx, zone.source, entity.position, zone.radius)) {
          this.ctx.combat.dealDamage(zone.source, enemy, zone.damage, 'magical')
          enemy.status.slow = SLOW_REFRESH
          enemy.status.slowFactor = zone.slow
        }
      }

      if (zone.remaining <= 0) {
        this.ctx.world.remove(entity)
      }
    }
  }
}
