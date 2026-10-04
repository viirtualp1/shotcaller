import { isAlive, isDisabled, isHero } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

/** Mend repairs a building while the hero stands still; a stun, death or a fallen building ends it. */
export class ChannelSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number) {
    const { world, combat } = this.ctx
    for (const hero of [...this.ctx.queries.channelers]) {
      const channel = hero.channel
      if (!isHero(hero) || !isAlive(hero) || isDisabled(hero) || !isAlive(channel.structure)) {
        world.removeComponent(hero, 'channel')

        continue
      }

      channel.remaining -= dt
      channel.tickTimer -= dt

      if (channel.tickTimer <= 0) {
        channel.tickTimer += channel.tick
        combat.repair(channel.structure, channel.repair, hero, channel.reclaims)
      }

      if (channel.remaining <= 0) {
        world.removeComponent(hero, 'channel')
      }
    }
  }
}
