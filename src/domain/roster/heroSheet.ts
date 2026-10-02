import { HEROES } from '@/content/heroes'
import type { HeroId, ItemId, StarLevel, SynergyId } from '@/content/ids'
import { ITEMS } from '@/content/items'
import { combineModifiers, type StatModifiers } from '@/content/modifiers'
import { ROLES } from '@/content/roles'
import { BATTLE, STAR_POWER } from '@/content/rules'
import { SYNERGY_BY_ID } from '@/content/synergies'

/** A hero's numbers as the battle uses them. */
export interface HeroNumbers {
  readonly hp: number
  readonly damage: number
  /** Seconds between two attacks. */
  readonly attackInterval: number
  readonly speed: number
  /** Share of attack damage the hero does not take: armor, and any cut to all damage on top. */
  readonly protection: number
  /** Multiplies ability damage, shields and summons; the hero's stars are already in. */
  readonly spellPower: number
  /** Multiplies healing from abilities; the hero's stars are already in. */
  readonly healPower: number
  readonly manaGain: number
  readonly structureDamage: number
}

export interface ManaPlan {
  /** Mana the ability costs: the bar fills to it, the hero casts and starts again from zero. */
  readonly cost: number
  readonly perAttack: number
  /** Mana from losing a tenth of the hero's health. */
  readonly perTenthOfHealthLost: number
  /** Attacks that fill the bar from empty, without help from damage taken. */
  readonly attacksToCast: number
  /** Attacks before the first cast of a fight; fewer when the role starts with mana. */
  readonly attacksToFirstCast: number
}

/**
 * A hero's stat sheet, Dota style: `base` is the hero with its stars and role, as it comes from the shop;
 * `total` adds items and the synergies of its lane. The battle builds its heroes with the same modifiers.
 */
export interface HeroSheet {
  readonly base: HeroNumbers
  readonly total: HeroNumbers
  readonly mana: ManaPlan
}

export interface HeroLoadout {
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly items?: readonly ItemId[]
  /** Synergies active on the hero's lane; none on the bench. */
  readonly synergies?: readonly SynergyId[]
}

function numbersOf(heroId: HeroId, stars: StarLevel, mods: StatModifiers): HeroNumbers {
  const { stats } = HEROES[heroId]
  const star = STAR_POWER[stars]

  return {
    hp: stats.hp * star * mods.maxHp,
    damage: stats.damage * star * mods.damage,
    attackInterval: stats.attackInterval / mods.attackSpeed,
    speed: stats.speed * mods.speed,
    protection: 1 - (1 - stats.armor) * mods.damageTaken,
    spellPower: star * mods.spellPower,
    healPower: star * mods.healPower,
    manaGain: mods.manaGain,
    structureDamage: BATTLE.hero.structureDamage * mods.structureDamage,
  }
}

export function heroSheet({ heroId, stars, items = [], synergies = [] }: HeroLoadout): HeroSheet {
  const hero = HEROES[heroId]
  const role = ROLES[hero.role]

  const synergyModifiers = synergies
    .flatMap((id) => SYNERGY_BY_ID[id].effects)
    .filter((effect) => effect.appliesTo === 'all' || effect.appliesTo === hero.role)
    .map((effect) => effect.modifiers)

  const total = numbersOf(
    heroId,
    stars,
    combineModifiers(role.modifiers, ...synergyModifiers, ...items.map((item) => ITEMS[item].modifiers)),
  )

  const cost = hero.stats.mana
  const perAttack = BATTLE.manaPerAttack * total.manaGain

  return {
    base: numbersOf(heroId, stars, combineModifiers(role.modifiers)),
    total,
    mana: {
      cost,
      perAttack,
      perTenthOfHealthLost: (BATTLE.manaPerDamageTaken / 10) * total.manaGain,
      attacksToCast: Math.ceil(cost / perAttack),
      attacksToFirstCast: Math.ceil((cost * (1 - (role.startingManaRatio ?? 0))) / perAttack),
    },
  }
}
