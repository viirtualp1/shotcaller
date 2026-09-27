import { BATTLE } from '@/content/rules'
import { direction, distance, offset, stepTowards } from '@/core/math/vec2'
import { isAlive, isDisabled, type Unit } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'
import { inReach } from './AttackSystem'

const WAYPOINT_REACHED = 8
const TOWER_LOOKAHEAD = 16

export class MovementSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number) {
    for (const unit of this.ctx.queries.movers) {
      if (!isAlive(unit) || isDisabled(unit) || unit.status.root > 0) {
        continue
      }

      const slow = unit.status.slow > 0 ? 1 - unit.status.slowFactor : 1
      const step = unit.speed * slow * dt
      const target = unit.targeting.target
      if (target && isAlive(target)) {
        if (!inReach(unit, target)) {
          stepTowards(unit.position, target.position, step)
        }

        continue
      }

      if (unit.targeting.chasing) {
        unit.targeting.chasing = false
        this.rejoinLane(unit)
      }

      if (unit.defend) {
        if (distance(unit.position, unit.defend.point) > BATTLE.defense.holdDistance) {
          stepTowards(unit.position, unit.defend.point, step)
        }

        continue
      }

      const quarry = unit.roamer?.quarry
      if (quarry && isAlive(quarry)) {
        stepTowards(unit.position, quarry.position, step)
      } else {
        this.followLane(unit, step)
      }
    }
  }

  private followLane(unit: Unit, step: number) {
    const follower = unit.laneFollower
    if (!follower) {
      return
    }

    const points = follower.path.points
    let waypoint = points[follower.waypoint]!
    if (distance(unit.position, waypoint) < WAYPOINT_REACHED && follower.waypoint < points.length - 1) {
      follower.waypoint++
      waypoint = points[follower.waypoint]!
    }

    if (follower.avoidsTowers) {
      const { safety } = this.ctx
      if (safety.isUnsafe(unit.team, unit.position)) {
        stepTowards(unit.position, points[Math.max(0, follower.waypoint - 1)]!, step)

        return
      }

      const probe = offset(unit.position, direction(unit.position, waypoint), TOWER_LOOKAHEAD)
      if (safety.isUnsafe(unit.team, probe)) {
        return
      }
    }

    stepTowards(unit.position, waypoint, step)
  }

  private rejoinLane(unit: Unit) {
    const follower = unit.laneFollower
    if (!follower) {
      return
    }

    const { segment } = this.ctx.map.project(follower.path, unit.position)
    follower.waypoint = Math.min(segment + 1, follower.path.points.length - 1)
  }
}
