import { HEROES } from '@/content/heroes'
import type { LaneId, ModeId, RoleId } from '@/content/ids'
import { MODES } from '@/content/modes'
import type { OwnedHero, Roster } from '../roster/Roster'
import { resolveLane } from '../synergy/resolveLane'
import { heroPower } from './LaneOptimizer'

const strongestFirst = (a: OwnedHero, b: OwnedHero) => heroPower(b) - heroPower(a)

const activeSynergies = (lane: LaneId, heroes: readonly OwnedHero[], mode: ModeId) =>
  resolveLane(
    lane,
    heroes.map((h) => h.heroId),
    mode,
  ).synergies.length

/**
 * Finds a hero that would switch a lane synergy on in one move: from the bench while the board has room,
 * otherwise from another lane that keeps all of its own synergies without them.
 */
export function findRecruit(
  roster: Roster,
  boardCapacity: number,
  lane: LaneId,
  roles: readonly RoleId[],
  mode: ModeId,
) {
  /* An adaptive hero takes whichever role the lane is missing. */
  const fits = (hero: OwnedHero) => HEROES[hero.heroId].adaptive || roles.includes(HEROES[hero.heroId].role)

  if (roster.boardCount < boardCapacity) {
    const fromBench = roster.bench.filter(fits).sort(strongestFirst)[0]

    if (fromBench) {
      return fromBench
    }
  }

  const spare = MODES[mode].lanes
    .filter((other) => other !== lane)
    .flatMap((other) => {
      const heroes = roster.lane(other)
      const before = activeSynergies(other, heroes, mode)

      return heroes.filter(
        (hero) =>
          fits(hero) &&
          activeSynergies(
            other,
            heroes.filter((h) => h !== hero),
            mode,
          ) >= before,
      )
    })

  return spare.sort(strongestFirst)[0] ?? null
}
