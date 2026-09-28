import { ROLES } from '@/content/roles'
import type { HeroUnit } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

const SPAWN_SPREAD = 10

export class RespawnSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number) {
    for (const hero of this.ctx.queries.heroes) {
      if (!hero.dead) {
        continue
      }

      hero.respawnTimer = (hero.respawnTimer ?? 0) - dt

      if (hero.respawnTimer <= 0) {
        this.revive(hero)
      }
    }
  }

  private revive(hero: HeroUnit) {
    const { world, map, rng } = this.ctx
    const base = map.base(hero.team)
    hero.position.x = base.x + rng.range(-SPAWN_SPREAD, SPAWN_SPREAD)
    hero.position.y = base.y + rng.range(-SPAWN_SPREAD, SPAWN_SPREAD)
    hero.health.current = hero.health.max
    hero.mana.current = hero.mana.max * (ROLES[hero.hero.role].startingManaRatio ?? 0)
    hero.status.stun = hero.status.root = hero.status.slow = 0
    hero.targeting.target = null
    hero.targeting.chasing = false

    if (hero.laneFollower) {
      hero.laneFollower.waypoint = 1
    }

    if (hero.roamer) {
      hero.roamer.quarry = null
      hero.roamer.farm = null
    }

    if (hero.spin) {
      world.removeComponent(hero, 'spin')
    }

    if (hero.dot) {
      world.removeComponent(hero, 'dot')
    }

    if (hero.shield) {
      world.removeComponent(hero, 'shield')
    }

    delete hero.respawnTimer
    world.removeComponent(hero, 'dead')

    this.ctx.events.emit('revived', {
      hero,
      byItem: false,
    })
  }
}
