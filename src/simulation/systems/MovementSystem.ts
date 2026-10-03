import { BATTLE } from '@/content/rules'
import { SANDBOX, TRAINING_CAMPS } from '@/content/sandbox'
import { direction, distance, offset, stepTowards, type Vec2 } from '@/core/math/vec2'
import { isAlive, isDisabled, type Unit } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'
import { aheadOfCores, aheadOfLaneMates, holdLine } from '../services/laneOrders'
import { isThroneNearlyDown } from '../services/TowerSafety'
import { inReach } from './AttackSystem'

const WAYPOINT_REACHED = 8
const TOWER_LOOKAHEAD = 16
/** Farther than this from its lane, a hero walks back to the lane before going on along it. */
const LANE_REJOIN_DISTANCE = 60

export class MovementSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number) {
    for (const unit of this.ctx.queries.movers) {
      if (!isAlive(unit) || isDisabled(unit) || unit.status.root > 0) {
        continue
      }

      const slow = unit.status.slow > 0 ? 1 - unit.status.slowFactor : 1
      const step = unit.speed * slow * dt

      if (unit.training?.goal === 'dummies') {
        const [x, y] = TRAINING_CAMPS[this.ctx.map.mode][unit.training.lane]!

        const camp = {
          x,
          y,
        }

        if (distance(unit.position, camp) > SANDBOX.campRadius / 2) {
          stepTowards(unit.position, camp, step)

          continue
        }
      }

      if (unit.retreat && unit.retreat.remaining > 0 && !unit.defend) {
        this.fallBack(unit, step)

        continue
      }

      const target = unit.targeting.target
      if (target && isAlive(target)) {
        if (inReach(unit, target)) {
          continue
        }

        if (!isThroneNearlyDown(target) && this.leadsUnderTower(unit, target.position, step)) {
          unit.targeting.target = null
        } else {
          stepTowards(unit.position, target.position, step)

          continue
        }
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
      } else if (!this.walkToFarm(unit, step)) {
        this.followLane(unit, step)
      }
    }
  }

  private walkToFarm(unit: Unit, step: number) {
    const roamer = unit.roamer
    const farm = roamer?.farm
    if (!roamer || !farm) {
      return false
    }

    if (!isAlive(farm) || this.leadsUnderTower(unit, farm.position, step)) {
      roamer.farm = null

      return false
    }

    stepTowards(unit.position, farm.position, step)

    return true
  }

  /** Heroes never chase a target through the range of an untanked enemy tower. */
  private leadsUnderTower(unit: Unit, goal: Vec2, step: number) {
    if (unit.kind !== 'hero') {
      return false
    }

    const { safety } = this.ctx
    const probe = offset(unit.position, direction(unit.position, goal), step + TOWER_LOOKAHEAD)

    return !safety.isUnsafeFor(unit, unit.position) && safety.isUnsafeFor(unit, probe)
  }

  private followLane(unit: Unit, step: number) {
    const follower = unit.laneFollower
    if (!follower) {
      return
    }

    if (unit.kind === 'hero' && (this.returnToLane(unit, step) || this.keepsToOrders(unit, step))) {
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
      if (safety.isUnsafeFor(unit, unit.position)) {
        stepTowards(unit.position, points[Math.max(0, follower.waypoint - 1)]!, step)

        return
      }

      const probe = offset(unit.position, direction(unit.position, waypoint), TOWER_LOOKAHEAD)
      if (safety.isUnsafeFor(unit, probe)) {
        return
      }
    }

    stepTowards(unit.position, waypoint, step)
  }

  /**
   * A hero off its lane (after a gank, a chase or defending the base) heads for the nearest point of the lane
   * instead of cutting across the map to its next waypoint, and backs off towards its base rather than
   * stopping when that way leads into an untanked enemy tower.
   */
  private returnToLane(unit: Unit, step: number) {
    const follower = unit.laneFollower
    if (!follower) {
      return false
    }

    const { map, safety } = this.ctx
    const { point, segment, distance: off } = map.project(follower.path, unit.position)
    if (off <= LANE_REJOIN_DISTANCE) {
      return false
    }

    follower.waypoint = Math.min(segment + 1, follower.path.points.length - 1)
    const probe = offset(unit.position, direction(unit.position, point), step + TOWER_LOOKAHEAD)
    stepTowards(unit.position, safety.isUnsafeFor(unit, probe) ? map.base(unit.team) : point, step)

    return true
  }

  /**
   * Under Hold a hero stops at its line and walks back to it after a chase; under Group it waits for the
   * lane-mate furthest behind. A support also waits behind its cores. Returns true when the hero stays.
   */
  private keepsToOrders(unit: Unit, step: number) {
    const { map, queries } = this.ctx
    const line = holdLine(map, unit)

    if (line !== null) {
      const path = unit.laneFollower!.path
      const along = map.project(path, unit.position).along
      if (along < line) {
        return false
      }

      if (along > line + WAYPOINT_REACHED) {
        stepTowards(unit.position, map.pointAt(path, line), step)
      }

      return true
    }

    return aheadOfLaneMates(map, queries.heroes, unit) || aheadOfCores(map, queries.heroes, unit)
  }

  /** Back along the lane the way it came, towards its allies and its own towers. */
  private fallBack(unit: Unit, step: number) {
    const follower = unit.laneFollower
    if (!follower) {
      return
    }

    const { segment } = this.ctx.map.project(follower.path, unit.position)
    follower.waypoint = Math.min(segment + 1, follower.path.points.length - 1)
    stepTowards(unit.position, follower.path.points[segment]!, step)
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
