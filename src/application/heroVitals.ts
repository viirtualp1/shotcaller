import { HEROES } from '@/content/heroes'
import { BATTLE, STAR_POWER } from '@/content/rules'
import { ROLES } from '@/content/roles'
import { distance } from '@/core/math/vec2'
import { isAlive, type HeroUnit, type Unit } from '@/simulation/ecs/components'
import { heroSheet, type HeroLoadout } from '@/domain/roster/heroSheet'

export interface HeroVitals {
  readonly health: number
  readonly maxHealth: number
  readonly mana: number
  readonly maxMana: number
  readonly healthRegen: number
  readonly manaPerAttack: number
  readonly damage: number
  readonly attackInterval: number
  readonly protection: number
}

export function previewHeroVitals(loadout: HeroLoadout): HeroVitals {
  const sheet = heroSheet(loadout)
  const hero = HEROES[loadout.heroId]
  const role = ROLES[hero.role]

  return {
    health: sheet.total.hp,
    maxHealth: sheet.total.hp,
    mana: hero.stats.mana * (role.startingManaRatio ?? 0),
    maxMana: hero.stats.mana,
    healthRegen:
      (sheet.total.hp * (role.healAura?.hpPercentPerSecond ?? 0) * sheet.total.healPower) /
      STAR_POWER[loadout.stars],
    manaPerAttack: sheet.mana.perAttack,
    damage: sheet.total.damage,
    attackInterval: sheet.total.attackInterval,
    protection: sheet.total.protection,
  }
}

/** Actual battle values, including farm damage and healing auras currently reaching this hero. */
export function heroVitals(hero: HeroUnit, auras: readonly Unit[]): HeroVitals {
  const farm = ROLES[hero.hero.role].farm
  const farmPower = farm ? 1 + Math.min(farm.max, hero.hero.farmStacks * farm.perLastHit) : 1

  const healthRegen = !isAlive(hero)
    ? 0
    : auras.reduce((sum, source) => {
        const aura = source.healAura
        return aura &&
          isAlive(source) &&
          source.team === hero.team &&
          distance(source.position, hero.position) - hero.radius <= aura.radius
          ? sum + hero.health.max * aura.hpPercentPerSecond
          : sum
      }, 0)

  return {
    health: isAlive(hero) ? hero.health.current : 0,
    maxHealth: hero.health.max,
    mana: hero.mana.current,
    maxMana: hero.mana.max,
    healthRegen,
    manaPerAttack: BATTLE.manaPerAttack * hero.mana.gain,
    damage: hero.attack.damage * farmPower,
    attackInterval: hero.attack.interval,
    protection: 1 - (1 - hero.armor) * (hero.damageTaken ?? 1),
  }
}
