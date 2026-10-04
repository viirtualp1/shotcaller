import { direction, distance, offset } from '@/core/math/vec2'
import { isAlive, isDisabled, type HeroUnit, type Unit } from '../ecs/components'
import { healthRatio } from '../abilities/selectors'
import type { SimulationContext, System } from '../SimulationContext'

/** How far behind the tower, towards its own base, a hero arrives. */
const ARRIVAL_GAP = 18

/**
 * Town Portal: once a round, an allied tower hit while under the item's health share calls the nearest
 * hero carrying one that is far enough away. The hero arrives behind the tower and fights on its lane.
 */
export class PortalSystem implements System {
  private readonly calls = new Set<Unit>()

  constructor(private readonly ctx: SimulationContext) {
    ctx.events.on('structureDamaged', ({ structure }) => {
      if (structure.structure?.type === 'tower' && isAlive(structure)) {
        this.calls.add(structure)
      }
    })
  }

  update() {
    for (const tower of this.calls) {
      const hero = this.responder(tower)
      if (hero) {
        this.travel(hero, tower)
      }
    }

    this.calls.clear()
  }

  private responder(tower: Unit) {
    if (!isAlive(tower)) {
      return null
    }

    let best: HeroUnit | null = null
    for (const hero of this.ctx.queries.heroes) {
      const effects = hero.itemEffects
      if (
        hero.team !== tower.team ||
        !effects ||
        effects.portal <= 0 ||
        healthRatio(tower) >= effects.portal ||
        !isAlive(hero) ||
        isDisabled(hero) ||
        hero.channel ||
        hero.training ||
        distance(hero.position, tower.position) < effects.portalDistance
      ) {
        continue
      }

      if (!best || distance(hero.position, tower.position) < distance(best.position, tower.position)) {
        best = hero
      }
    }

    return best
  }

  private travel(hero: HeroUnit, tower: Unit) {
    const { map, setup, world } = this.ctx
    const from = { ...hero.position }
    const base = map.base(hero.team)
    Object.assign(
      hero.position,
      offset(tower.position, direction(tower.position, base), tower.radius + ARRIVAL_GAP),
    )

    hero.itemEffects!.portal = 0
    hero.targeting.target = null
    hero.targeting.chasing = false
    hero.status.root = 0

    const lane = tower.structure?.lane
    const follower = hero.laneFollower
    if (lane && follower) {
      hero.hero.lane = lane
      follower.path = map.path(hero.team, lane)

      follower.waypoint = Math.min(
        map.project(follower.path, hero.position).segment + 1,
        follower.path.points.length - 1,
      )

      follower.stance = setup.stances?.[hero.team][lane]
    }

    if (hero.retreat) {
      world.removeComponent(hero, 'retreat')
    }

    this.ctx.events.emit('teleported', {
      hero,
      from,
      to: { ...hero.position },
    })
  }
}
