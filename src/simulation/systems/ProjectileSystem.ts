import { distance, stepTowards } from '@/core/math/vec2'
import { isAlive } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

export class ProjectileSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number): void {
    const { world, combat, events } = this.ctx
    for (const entity of this.ctx.queries.projectiles) {
      const projectile = entity.projectile
      const { target } = projectile
      if (!isAlive(target) && !projectile.splash) {
        world.remove(entity)
        continue
      }
      const step = projectile.speed * dt
      if (distance(entity.position, target.position) > step + target.radius) {
        stepTowards(entity.position, target.position, step)
        continue
      }
      if (projectile.splash) {
        const at = { ...target.position }
        combat.splash(projectile.source, at, projectile.splash, projectile.damage, projectile.damageType)
        events.emit('burst', { at, radius: projectile.splash, color: entity.color ?? 0xffffff })
      } else {
        combat.dealDamage(projectile.source, target, projectile.damage, projectile.damageType)
        if (projectile.poison) combat.poison(projectile.source, target, projectile.poison)
      }
      world.remove(entity)
    }
  }
}
