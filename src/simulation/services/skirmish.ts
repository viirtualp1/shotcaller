import { BATTLE } from '@/content/rules'
import { distance } from '@/core/math/vec2'
import { isAlive, type Unit } from '../ecs/components'

/** What a hero brings to a fight: the health it has left times the damage it deals a second. */
const powerOf = (hero: Unit) =>
  (hero.health?.current ?? 0) * ((hero.attack?.damage ?? 0) / Math.max(hero.attack?.interval ?? 1, 0.01))

/**
 * True when a hero with no ally hero around would take on enemy heroes that clearly outweigh it:
 * the one walking into a fight ahead of the others. In a team fight the team fights it out.
 */
export function isCaughtAlone(heroes: Iterable<Unit>, hero: Unit) {
  let theirs = 0

  for (const other of heroes) {
    if (
      other === hero ||
      !isAlive(other) ||
      distance(other.position, hero.position) > BATTLE.skirmish.radius
    ) {
      continue
    }

    if (other.team === hero.team) {
      return false
    }

    theirs += powerOf(other)
  }

  return theirs > powerOf(hero) * BATTLE.skirmish.outmatchedAt
}
