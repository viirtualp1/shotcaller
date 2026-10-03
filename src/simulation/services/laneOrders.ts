import { BATTLE } from '@/content/rules'
import type { Vec2 } from '@/core/math/vec2'
import { isAlive, type Unit } from '../ecs/components'
import type { LaneMap } from '../map/LaneMap'

/** How far along its lane a hero under Hold goes: a little past its own outermost tower. */
export function holdLine(map: LaneMap, hero: Unit) {
  const follower = hero.laneFollower
  if (follower?.stance !== 'hold') {
    return null
  }

  return map.frontTowerAlong(follower.path) + BATTLE.stance.holdMargin
}

/** True when a point lies past the line a hero under Hold keeps to. */
export function beyondHoldLine(map: LaneMap, hero: Unit, point: Vec2) {
  const line = holdLine(map, hero)

  return line !== null && map.project(hero.laneFollower!.path, point).along > line
}

/** How far along its lane the frontmost living core lane-mate of a support stands; null for other heroes. */
export function coreFront(map: LaneMap, heroes: Iterable<Unit>, hero: Unit) {
  const follower = hero.laneFollower
  if (!follower || hero.hero?.role !== 'support') {
    return null
  }

  let front = -Infinity
  for (const mate of heroes) {
    if (
      mate === hero ||
      mate.team !== hero.team ||
      mate.hero?.lane !== hero.hero.lane ||
      mate.hero.role === 'support' ||
      !isAlive(mate)
    ) {
      continue
    }

    front = Math.max(front, map.project(follower.path, mate.position).along)
  }

  return front === -Infinity ? null : front
}

/** True when a support has walked up to the cores of its lane: it waits behind them instead of leading. */
export function aheadOfCores(map: LaneMap, heroes: Iterable<Unit>, hero: Unit) {
  const front = coreFront(map, heroes, hero)

  return (
    front !== null && map.project(hero.laneFollower!.path, hero.position).along > front - BATTLE.support.trail
  )
}

/** True when a point lies further along the lane than a support's cores plus the given slack. */
export function beyondCores(map: LaneMap, heroes: Iterable<Unit>, hero: Unit, point: Vec2, slack: number) {
  const front = coreFront(map, heroes, hero)

  return front !== null && map.project(hero.laneFollower!.path, point).along > front + slack
}

/** True when a hero under Group is ahead of the lane-mate furthest behind; a fallen one counts as at its base. */
export function aheadOfLaneMates(map: LaneMap, heroes: Iterable<Unit>, hero: Unit) {
  const follower = hero.laneFollower
  if (follower?.stance !== 'group' || !hero.hero) {
    return false
  }

  let rear = Infinity
  for (const mate of heroes) {
    if (mate === hero || mate.team !== hero.team || mate.hero?.lane !== hero.hero.lane) {
      continue
    }

    rear = Math.min(rear, isAlive(mate) ? map.project(follower.path, mate.position).along : 0)
  }

  return (
    rear !== Infinity && map.project(follower.path, hero.position).along > rear + BATTLE.stance.groupSpread
  )
}
