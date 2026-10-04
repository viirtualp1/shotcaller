import { useI18n } from 'vue-i18n'
import { ABILITY_NAMES } from '@/content/abilities'
import { TWISTS, type TwistId } from '@/content/experiments'
import { HEROES, ROLE_SIGNATURES } from '@/content/heroes'
import type {
  AbilityId,
  HeroId,
  ItemId,
  LaneId,
  RoleId,
  StarLevel,
  StructureSlot,
  SynergyId,
} from '@/content/ids'
import { baseItemOf, ITEMS, itemModifiers } from '@/content/items'
import type { StatModifiers } from '@/content/modifiers'
import { ROLES } from '@/content/roles'
import { SYNERGY_BY_ID } from '@/content/synergies'
import { TALENTS, tunedParams, type TalentChoice, type TalentDefinition } from '@/content/talents'
import type { DomainError } from '@/domain/errors'
import { formatNumber, type MessageSchema } from '../i18n'

type Params = Record<string, string>
type Format = (value: number) => string

const SCALED_PARAMS = new Set(['damage', 'heal', 'hp', 'absorb', 'poison', 'repair', 'splashDamage'])
/** Healing, shields and repairs grow with heal power rather than spell power. */
const HEALING_PARAMS = new Set(['heal', 'absorb', 'repair'])
const PERCENT_PARAMS = new Set(['slow', 'threshold'])
/** Multipliers below one read naturally as "N% less". */
const REDUCTION_PARAMS = new Set(['falloff', 'holdProtection', 'guard'])
/** Multipliers above one read as "N% more". */
const GAIN_PARAMS = new Set(['pushAttackSpeed', 'pushStructureDamage', 'groupDamage', 'power'])
/** Item effects that are counts, distances, seconds or damage rather than shares. */
const PLAIN_EFFECTS = new Set(['soulMax', 'bondRange', 'echoDelay', 'portalDistance', 'curse'])

const percentGain = (format: Format, multiplier: number) => format(Math.round((multiplier - 1) * 100))
const percentCut = (format: Format, multiplier: number) => format(Math.round((1 - multiplier) * 100))

/** Healing and shields follow heal power; damage and summons follow spell power. Talents bring their own values. */
function abilityParams(
  format: Format,
  id: AbilityId,
  power: number,
  healPower: number,
  talents: readonly TalentChoice[] = [],
) {
  const params: Params = {}
  for (const [key, value] of Object.entries(tunedParams(id, talents)) as [string, number][]) {
    if (SCALED_PARAMS.has(key)) {
      params[key] = format(Math.round(value * (HEALING_PARAMS.has(key) ? healPower : power)))
    } else if (PERCENT_PARAMS.has(key)) {
      params[key] = format(Math.round(value * 100))
    } else if (REDUCTION_PARAMS.has(key)) {
      params[key] = percentCut(format, value)
    } else if (GAIN_PARAMS.has(key)) {
      params[key] = percentGain(format, value)
    } else {
      params[key] = format(value)
    }
  }

  return params
}

function modifierParams(format: Format, modifiers: Partial<StatModifiers>) {
  const params: Params = {}
  for (const [key, value] of Object.entries(modifiers) as [keyof StatModifiers, number][]) {
    params[key] = value < 1 ? percentCut(format, value) : percentGain(format, value)
    params[`${key}Mult`] = format(value)
  }

  return params
}

function roleParams(format: Format, role: RoleId) {
  const definition = ROLES[role]
  return {
    perHit: format((definition.farm?.perLastHit ?? 0) * 100),
    max: format((definition.farm?.max ?? 0) * 100),
    percent: format(
      definition.healAura
        ? definition.healAura.hpPercentPerSecond * 100
        : (definition.startingManaRatio ?? 0) * 100,
    ),
    mult: format(definition.modifiers.manaGain ?? definition.modifiers.structureDamage ?? 1),
    bonus: format((definition.laneCreepDamageBonus ?? 0) * 100),
    speed: percentGain(format, definition.modifiers.speed ?? 1),
    evasion: format((definition.evasion ?? 0) * 100),
  }
}

function itemParams(format: Format, id: ItemId, role?: RoleId) {
  const { modifiers, effects } = ITEMS[id]
  const params = modifierParams(format, role ? itemModifiers(id, role) : modifiers)
  for (const [key, value] of Object.entries(effects)) {
    params[key] = PLAIN_EFFECTS.has(key) ? format(value) : format(Math.round(value * 100))
  }

  return params
}

export const starsLabel = (stars: StarLevel) => '★'.repeat(stars)

/** Localised game text. Hero, ability and item names are proper names and come from content untranslated. */
export function useGameText() {
  const { t, locale } = useI18n<{ message: MessageSchema }>()
  const number: Format = (value) => formatNumber(locale.value, value)
  const precise: Format = (value) => formatNumber(locale.value, value, 2)
  const signed: Format = (value) => (value > 0 ? `+${number(value)}` : value < 0 ? `−${number(-value)}` : '0')

  return {
    t,
    number,
    /** Up to two decimals, for attack times. */
    precise,
    /** A change such as a rating delta: "+12", "−8", "0". */
    signed,
    /** Every numeric rating, including changes and rank thresholds, carries its MMR unit. */
    mmr: (value: number, withSign = false) => `${withSign ? signed(value) : number(value)}\u00a0MMR`,
    heroName: (id: HeroId) => HEROES[id].name,
    roleName: (id: RoleId) => t(`roles.${id}.name`),
    /** The role a hero shows: the one it took on its lane, or "adaptive" before it has one. */
    heroRoleName: (id: HeroId, role?: RoleId) =>
      role
        ? t(`roles.${role}.name`)
        : HEROES[id].adaptive
          ? t('roles.adaptive.name')
          : t(`roles.${HEROES[id].role}.name`),
    rolePassive: (id: RoleId) => t(`roles.${id}.passive`, roleParams(number, id)),
    /** Innate hero passive on top of the role one, if the hero has any. */
    heroPassive: (id: HeroId) => {
      const { bash, manaRegen } = HEROES[id]
      if (bash) {
        return t('innate.bash', {
          chance: number(bash.chance * 100),
          stun: number(bash.stun),
        })
      }

      return manaRegen ? t('innate.manaRegen', { mana: number(manaRegen) }) : null
    },
    abilityName: (id: AbilityId) => ABILITY_NAMES[id],
    /**
     * Mimicry names the ability of each role; given the role it took, it describes that one ability. Talents in effect
     * show up in the numbers.
     */
    abilityDescription: (
      id: AbilityId,
      power = 1,
      healPower = power,
      role?: RoleId,
      talents: readonly TalentChoice[] = [],
    ): string => {
      if (id !== 'mimic') {
        return t(`abilities.${id}`, abilityParams(number, id, power, healPower, talents))
      }

      if (role) {
        const borrowed = ROLE_SIGNATURES[role]
        return t('abilities.mimicAs', {
          ability: ABILITY_NAMES[borrowed],
          effect: t(`abilities.${borrowed}`, abilityParams(number, borrowed, power, healPower)),
        })
      }

      return t(
        'abilities.mimic',
        Object.fromEntries(
          Object.entries(ROLE_SIGNATURES).map(([r, ability]) => [r, ABILITY_NAMES[ability]]),
        ),
      )
    },
    talentName: (id: AbilityId, talent: TalentChoice) => TALENTS[id][talent].name,
    /** What the talent changes, with the numbers it brings at the hero's power. */
    talentDescription: (id: AbilityId, talent: TalentChoice, power = 1, healPower = power) => {
      const cost = (TALENTS[id][talent] as TalentDefinition).manaCost ?? 1

      return t(`talents.${id}.${talent}`, {
        ...abilityParams(number, id, power, healPower, [talent]),
        manaCost: percentCut(number, cost),
      })
    },
    twistName: (id: TwistId) => t(`twists.${id}.name`),
    twistEffect: (id: TwistId) => {
      const twist = TWISTS[id]
      return t(`twists.${id}.effect`, {
        damage: percentGain(number, twist.heroes?.damage ?? 1),
        manaGain: percentGain(number, twist.heroes?.manaGain ?? 1),
        speed: percentGain(number, twist.heroes?.speed ?? 1),
        reach: percentCut(number, twist.rangedReach ?? 1),
        siege: percentGain(number, twist.creepSiege ?? 1),
        walls: percentCut(number, twist.structureDamageTaken ?? 1),
      })
    },
    synergyName: (id: SynergyId) => t(`synergies.${id}.name`),
    synergyNeed: (id: SynergyId) => t(`synergyNeeds.${id}`),
    synergyEffect: (id: SynergyId) =>
      t(
        `synergies.${id}.effect`,
        modifierParams(number, Object.assign({}, ...SYNERGY_BY_ID[id].effects.map((e) => e.modifiers))),
      ),
    itemName: (id: ItemId) => ITEMS[id].name,
    /* An upgrade reads like the item it was made from, with its own numbers. */
    itemDescription: (id: ItemId, role?: RoleId) =>
      t(`items.${baseItemOf(id)}`, itemParams(number, id, role)),
    itemRoleDescription: (id: ItemId) =>
      id === 'gloves'
        ? t('itemTip.hasteRoles', {
            fighters: percentGain(number, itemModifiers(id, 'carry').attackSpeed ?? 1),
            pushers: percentGain(number, itemModifiers(id, 'pusher').attackSpeed ?? 1),
            casters: percentGain(number, itemModifiers(id, 'mage').attackSpeed ?? 1),
          })
        : id === 'staff'
          ? t('itemTip.powerRoles', {
              casters: percentGain(number, itemModifiers(id, 'mage').spellPower ?? 1),
              others: percentGain(number, itemModifiers(id, 'carry').spellPower ?? 1),
            })
          : null,
    slotName: (slot: LaneId | StructureSlot) => t(`lanes.${slot}`),
    errorText: (error: DomainError) =>
      error.code === 'boardFull'
        ? t('errors.boardFull', { capacity: error.capacity }, error.capacity)
        : t(`errors.${error.code}`),
  }
}
