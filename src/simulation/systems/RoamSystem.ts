import { BATTLE } from '@/content/rules'
import { distance } from '@/core/math/vec2'
import { healthRatio } from '../abilities/selectors'
import { isAlive, isDisabled, type Unit } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

const DISTANCE_WEIGHT = 0.5
const HEALTH_WEIGHT = 400
const OUTNUMBER_RADIUS = 250

/** Gankers leave their lane for any enemy hero that is already in trouble and not guarded by a crowd. */
export class RoamSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number) {
    for (const roamer of this.ctx.queries.roamers) {
      if (roamer.roamer.quarry && !isAlive(roamer.roamer.quarry)) {
        roamer.roamer.quarry = null
      }

      if (isDisabled(roamer)) {
        continue
      }

      roamer.roamer.thinkTimer -= dt

      if (roamer.roamer.thinkTimer > 0) {
        continue
      }

      roamer.roamer.thinkTimer = BATTLE.gank.thinkInterval
      roamer.roamer.quarry = this.pickQuarry(roamer)
    }
  }

  private pickQuarry(ganker: Unit) {
    if (healthRatio(ganker) < BATTLE.gank.minOwnHealth) {
      return null
    }

    const { queries, safety } = this.ctx
    const heroes = queries.heroes.entities.filter(isAlive)
    let best: Unit | null = null
    let bestScore = Infinity
    for (const enemy of heroes) {
      if (enemy.team === ganker.team || safety.isProtected(enemy, ganker.team)) {
        continue
      }

      const allies = heroes.filter(
        (h) =>
          h !== ganker &&
          h.team === ganker.team &&
          distance(h.position, enemy.position) < BATTLE.gank.supportRadius,
      ).length

      const guards = heroes.filter(
        (h) => h.team === enemy.team && distance(h.position, enemy.position) < OUTNUMBER_RADIUS,
      ).length

      if (!allies && healthRatio(enemy) > BATTLE.gank.hpThreshold) {
        continue
      }

      if (guards > allies + 1) {
        continue
      }

      const score =
        healthRatio(enemy) * HEALTH_WEIGHT + distance(ganker.position, enemy.position) * DISTANCE_WEIGHT

      if (score < bestScore) {
        bestScore = score
        best = enemy
      }
    }

    return best
  }
}
