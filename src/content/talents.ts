import { ABILITY_PARAMS, type AbilityParams } from './abilities'
import type { AbilityId, StarLevel } from './ids'

/** Which of a hero's two talents the coach picked when it reached two stars. */
export type TalentChoice = 0 | 1

export interface TalentDefinition<A extends AbilityId = AbilityId> {
  /** Proper name, untranslated like ability names. */
  readonly name: string
  /** New values for the ability's parameters, written out so later balance changes do not rewrite old ones. */
  readonly params: Partial<Record<keyof AbilityParams[A], number>>
  /** Multiplies the mana the ability costs. */
  readonly manaCost?: number
}

type TalentTable = { readonly [A in AbilityId]: readonly [TalentDefinition<A>, TalentDefinition<A>] }

/**
 * Two upgrades for every ability. A hero reaching two stars takes one of them; three stars bring both, so the
 * choice shapes the hero in the middle of a match without locking it out of the other upgrade for good.
 */
export const TALENTS: TalentTable = {
  packCall: [
    {
      name: 'Great Hunt',
      params: {
        count: 4,
        maxAlive: 8,
      },
    },
    {
      name: 'Iron Fangs',
      params: {
        damage: 34,
        hp: 240,
      },
    },
  ],
  starfall: [
    {
      name: 'Falling Stars',
      params: { damage: 230 },
    },
    {
      name: 'Event Horizon',
      params: { stun: 1.4 },
    },
  ],
  reap: [
    {
      name: 'Final Hour',
      params: { threshold: 0.28 },
    },
    {
      name: 'Long Shadow',
      params: {
        radius: 280,
        damage: 330,
      },
    },
  ],
  charge: [
    {
      name: 'Trample',
      params: {
        splash: 90,
        splashDamage: 80,
      },
    },
    {
      name: 'Long Charge',
      params: {
        radius: 380,
        damage: 150,
      },
    },
  ],
  volley: [
    {
      name: 'Arrow Storm',
      params: { arrows: 5 },
    },
    {
      name: 'Bodkin Points',
      params: { damage: 90 },
    },
  ],
  prayer: [
    {
      name: 'Communion',
      params: { targets: 2 },
    },
    {
      name: 'Devotion',
      params: { heal: 220 },
    },
  ],
  barrel: [
    {
      name: 'Big Keg',
      params: { radius: 95 },
    },
    {
      name: 'Sapping Charge',
      params: { structureBonus: 3.5 },
    },
  ],
  chainLightning: [
    {
      name: 'Forked Lightning',
      params: { bounces: 6 },
    },
    {
      name: 'Live Wire',
      params: { falloff: 0.88 },
    },
  ],
  poisonDagger: [
    {
      name: 'Venom',
      params: { poison: 40 },
    },
    {
      name: 'Hamstring',
      params: {
        slow: 0.5,
        duration: 5,
      },
    },
  ],
  backstab: [
    {
      name: 'Ambush',
      params: { damage: 250 },
    },
    {
      name: 'Long Shadow',
      params: { radius: 480 },
    },
  ],
  fireball: [
    {
      name: 'Wildfire',
      params: { radius: 105 },
    },
    {
      name: 'Inferno',
      params: { damage: 120 },
    },
  ],
  roots: [
    {
      name: 'Deep Roots',
      params: { duration: 3 },
    },
    {
      name: 'Living Sap',
      params: { heal: 170 },
    },
  ],
  whirl: [
    {
      name: 'Endless Spin',
      params: { duration: 2.4 },
    },
    {
      name: 'Wide Arc',
      params: { radius: 115 },
    },
  ],
  leap: [
    {
      name: 'Crushing Landing',
      params: { stun: 1.7 },
    },
    {
      name: 'Savage Leap',
      params: { damage: 150 },
    },
  ],
  raiseDead: [
    {
      name: 'Legion',
      params: {
        count: 3,
        maxAlive: 6,
      },
    },
    {
      name: 'Bone Guard',
      params: {
        hp: 380,
        damage: 32,
      },
    },
  ],
  blizzard: [
    {
      name: 'Whiteout',
      params: {
        slow: 0.6,
        duration: 5.5,
      },
    },
    {
      name: 'Great Storm',
      params: { radius: 125 },
    },
  ],
  quake: [
    {
      name: 'Tremor',
      params: { minTargets: 2 },
    },
    {
      name: 'Aftershock',
      params: { stun: 2 },
    },
  ],
  turret: [
    {
      name: 'Sturdy Build',
      params: {
        lifetime: 15,
        hp: 420,
      },
    },
    {
      name: 'Heavy Rounds',
      params: { damage: 40 },
    },
  ],
  hook: [
    {
      name: 'Long Chain',
      params: { radius: 340 },
    },
    {
      name: 'Barbed Hook',
      params: { damage: 290 },
    },
  ],
  assassinate: [
    {
      name: 'Deadeye',
      params: { damage: 350 },
    },
    {
      name: 'Far Sight',
      params: { radius: 620 },
    },
  ],
  shield: [
    {
      name: 'Ward Circle',
      params: {
        targets: 3,
        absorb: 420,
      },
    },
    {
      name: 'Rune of Iron',
      params: { absorb: 520 },
    },
  ],
  standard: [
    {
      name: 'Iron Pole',
      params: {
        lifetime: 14,
        hp: 450,
      },
    },
    {
      name: 'Rally Cry',
      params: { radius: 230 },
    },
  ],
  mend: [
    {
      name: 'Masterwork',
      params: { repair: 75 },
    },
    {
      name: 'Long Reach',
      params: { radius: 400 },
    },
  ],
  mimic: [
    {
      name: 'Perfect Copy',
      params: { power: 1.3 },
    },
    {
      name: 'Quick Study',
      params: {},
      manaCost: 0.75,
    },
  ],
}

/** Talents in effect: none below two stars, the chosen one at two, both at three. */
export function activeTalents(stars: StarLevel, choice?: TalentChoice): readonly TalentChoice[] {
  if (stars >= 3) {
    return [0, 1]
  }

  return stars === 2 && choice !== undefined ? [choice] : []
}

/** The ability's parameters with the active talents' new values, as the battle and the hero card use them. */
export function tunedParams<A extends AbilityId>(
  ability: A,
  talents: readonly TalentChoice[],
): { readonly [K in keyof AbilityParams[A]]: number } {
  return Object.assign({}, ...[ABILITY_PARAMS[ability], ...talents.map((i) => TALENTS[ability][i].params)])
}

/** Mana cost multiplier of the active talents. */
export const talentManaCost = (ability: AbilityId, talents: readonly TalentChoice[]) =>
  talents.reduce<number>((cost, i) => cost * ((TALENTS[ability][i] as TalentDefinition).manaCost ?? 1), 1)
