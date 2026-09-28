import { MODES } from '@/content/modes'
import { RELIC } from '@/content/rules'
import type { Vec2 } from '@/core/math/vec2'
import { isAlive, isHero } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

export interface Relic {
  readonly position: Vec2
  /** Battle time from which it can be taken again. */
  readyAt: number
}

/**
 * Heal relics on the one-lane bridge, as on ARAM: the first hero to step on a relic heals, and so do the allies
 * around it; it comes back a while later. Nobody is credited with the healing.
 */
export class RelicSystem implements System {
  readonly relics: Relic[]

  constructor(private readonly ctx: SimulationContext) {
    this.relics = MODES[ctx.setup.mode].relics
      ? ctx.map.relicPositions().map((position) => ({
          position,
          readyAt: RELIC.firstAt,
        }))
      : []
  }

  update() {
    const { clock, index, combat, events } = this.ctx

    for (const relic of this.relics) {
      if (clock.elapsed < relic.readyAt) {
        continue
      }

      const taker = index.near(relic.position, RELIC.pickRadius, (u) => isHero(u) && isAlive(u))[0]
      if (!taker) {
        continue
      }

      relic.readyAt = clock.elapsed + RELIC.cooldown

      const allies = index.near(
        relic.position,
        RELIC.shareRadius,
        (u) => isHero(u) && isAlive(u) && u.team === taker.team,
      )

      for (const ally of allies) {
        combat.heal(ally, ally.health.max * RELIC.heal, null)
      }

      events.emit('burst', {
        at: { ...relic.position },
        radius: RELIC.shareRadius,
        color: RELIC.color,
      })
    }
  }
}
