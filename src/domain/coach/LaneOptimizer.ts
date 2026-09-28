import { HEROES } from '@/content/heroes'
import { LANE_IDS, type LaneId } from '@/content/ids'
import type { StatModifiers } from '@/content/modifiers'
import { STAR_POWER } from '@/content/rules'
import type { Rng } from '@/core/random/rng'
import type { OwnedHero } from '../roster/Roster'
import { resolveLane } from '../synergy/resolveLane'

const MODIFIER_WEIGHTS: Readonly<Record<keyof StatModifiers, number>> = {
  maxHp: 0.8,
  damage: 1,
  attackSpeed: 1,
  spellPower: 0.9,
  healPower: 0.3,
  manaGain: 0.3,
  speed: 0.2,
  structureDamage: 0.1,
  damageTaken: 0.8,
}

/** Lower damage taken is better, so that one is scored by its inverse. */
const gain = (key: keyof StatModifiers, value: number) => (key === 'damageTaken' ? 1 / value : value) - 1

const ITEM_POWER = 0.8

export const heroPower = (hero: OwnedHero) =>
  (HEROES[hero.heroId].tier + 1.5) * STAR_POWER[hero.stars] + hero.items.length * ITEM_POWER

function effectiveness(modifiers: StatModifiers) {
  return (Object.keys(MODIFIER_WEIGHTS) as (keyof StatModifiers)[]).reduce(
    (product, key) => product * (1 + gain(key, modifiers[key]) * MODIFIER_WEIGHTS[key]),
    1,
  )
}

export class LaneOptimizer {
  constructor(private readonly noise = 0.05) {}

  /** Square root rewards spreading power across lanes instead of stacking one. */
  score(team: readonly OwnedHero[], lanes: readonly LaneId[]) {
    let total = 0
    for (const lane of LANE_IDS) {
      const group = team.filter((_, i) => lanes[i] === lane)
      if (!group.length) {
        continue
      }

      const report = resolveLane(
        lane,
        group.map((h) => h.heroId),
      )

      const power = group.reduce(
        (sum, h) => sum + heroPower(h) * effectiveness(report.synergyModifiersFor(HEROES[h.heroId].role)),
        0,
      )

      total += Math.sqrt(power)
    }

    return total
  }

  assign(team: readonly OwnedHero[], rng?: Rng) {
    let best: LaneId[] = team.map(() => 'mid')
    let bestScore = -Infinity
    for (let code = 0; code < LANE_IDS.length ** team.length; code++) {
      const lanes = team.map((_, i) => LANE_IDS[Math.floor(code / LANE_IDS.length ** i) % LANE_IDS.length]!)
      const score = this.score(team, lanes) + (rng ? rng.next() * this.noise : 0)
      if (score > bestScore) {
        bestScore = score
        best = lanes
      }
    }

    return best
  }
}
