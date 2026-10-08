import type { FactionEffects } from '@/content/factions'
import { HEROES } from '@/content/heroes'
import type { LaneId, ModeId } from '@/content/ids'
import { isShopItem } from '@/content/items'
import { MODES } from '@/content/modes'
import { combineModifiers, type StatModifiers } from '@/content/modifiers'
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
  (HEROES[hero.heroId].tier + 1.5) * STAR_POWER[hero.stars] +
  hero.items.reduce((sum, item) => sum + (isShopItem(item) ? 1 : 2), 0) * ITEM_POWER

/** A rough worth of a faction's passives, as a share of the hero's power. */
const passiveWorth = ({
  lifesteal = 0,
  thorns = 0,
  critChance = 0,
  critMultiplier = 1,
  echo = 0,
}: FactionEffects) => lifesteal * 0.8 + thorns * 0.4 + critChance * (critMultiplier - 1) + echo * 0.5

function effectiveness(modifiers: StatModifiers) {
  return (Object.keys(MODIFIER_WEIGHTS) as (keyof StatModifiers)[]).reduce(
    (product, key) => product * (1 + gain(key, modifiers[key]) * MODIFIER_WEIGHTS[key]),
    1,
  )
}

export class LaneOptimizer {
  constructor(private readonly noise = 0.05) {}

  /** Square root rewards spreading power across lanes instead of stacking one. */
  score(team: readonly OwnedHero[], lanes: readonly LaneId[], mode: ModeId) {
    let total = 0
    for (const lane of MODES[mode].lanes) {
      const group = team.filter((_, i) => lanes[i] === lane)
      if (!group.length) {
        continue
      }

      const report = resolveLane(
        lane,
        group.map((h) => h.heroId),
        mode,
      )

      const power = group.reduce((sum, h, i) => {
        const faction = report.factions.bonusFor(i)?.bonus

        const modifiers = combineModifiers(
          report.synergyModifiersFor(report.roles[i]!),
          faction?.modifiers ?? {},
        )

        return (
          sum + heroPower(h) * effectiveness(modifiers) * (1 + (faction ? passiveWorth(faction.effects) : 0))
        )
      }, 0)

      total += Math.sqrt(power)
    }

    return total
  }

  assign(team: readonly OwnedHero[], mode: ModeId, rng?: Rng) {
    const open = MODES[mode].lanes
    let best: LaneId[] = team.map(() => open[0]!)
    let bestScore = -Infinity
    for (let code = 0; code < open.length ** team.length; code++) {
      const lanes = team.map((_, i) => open[Math.floor(code / open.length ** i) % open.length]!)
      const score = this.score(team, lanes, mode) + (rng ? rng.next() * this.noise : 0)
      if (score > bestScore) {
        bestScore = score
        best = lanes
      }
    }

    return best
  }
}
