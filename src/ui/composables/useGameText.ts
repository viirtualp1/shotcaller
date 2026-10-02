import { useI18n } from 'vue-i18n'
import { ABILITY_NAMES, ABILITY_PARAMS } from '@/content/abilities'
import { HEROES } from '@/content/heroes'
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
import { ITEMS } from '@/content/items'
import type { StatModifiers } from '@/content/modifiers'
import { ROLES } from '@/content/roles'
import { SYNERGY_BY_ID } from '@/content/synergies'
import type { DomainError } from '@/domain/errors'
import { formatNumber, type MessageSchema } from '../i18n'

type Params = Record<string, string>
type Format = (value: number) => string

const SCALED_PARAMS = new Set(['damage', 'heal', 'hp', 'absorb', 'poison'])
const PERCENT_PARAMS = new Set(['slow'])
/** Multipliers below one read naturally as "N% less". */
const REDUCTION_PARAMS = new Set(['falloff'])

const percentGain = (format: Format, multiplier: number) => format(Math.round((multiplier - 1) * 100))
const percentCut = (format: Format, multiplier: number) => format(Math.round((1 - multiplier) * 100))

/** Healing follows heal power in battle; damage, shields and summons follow spell power. */
function abilityParams(format: Format, id: AbilityId, power: number, healPower: number) {
  const params: Params = {}
  for (const [key, value] of Object.entries(ABILITY_PARAMS[id])) {
    if (SCALED_PARAMS.has(key)) {
      params[key] = format(Math.round(value * (key === 'heal' ? healPower : power)))
    } else if (PERCENT_PARAMS.has(key)) {
      params[key] = format(Math.round(value * 100))
    } else if (REDUCTION_PARAMS.has(key)) {
      params[key] = percentCut(format, value)
    } else {
      params[key] = format(value)
    }
  }

  return params
}

function modifierParams(format: Format, modifiers: Partial<StatModifiers>) {
  const params: Params = {}
  for (const [key, value] of Object.entries(modifiers) as [keyof StatModifiers, number][]) {
    params[key] = key === 'damageTaken' ? percentCut(format, value) : percentGain(format, value)
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

function itemParams(format: Format, id: ItemId) {
  const { modifiers, effects } = ITEMS[id]
  const params = modifierParams(format, modifiers)
  for (const [key, value] of Object.entries(effects)) {
    params[key] = format(Math.round(value * 100))
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
    rolePassive: (id: RoleId) => t(`roles.${id}.passive`, roleParams(number, id)),
    /** Innate hero passive on top of the role one, if the hero has any. */
    heroPassive: (id: HeroId) => {
      const bash = HEROES[id].bash
      return bash
        ? t('innate.bash', {
            chance: number(bash.chance * 100),
            stun: number(bash.stun),
          })
        : null
    },
    abilityName: (id: AbilityId) => ABILITY_NAMES[id],
    abilityDescription: (id: AbilityId, power = 1, healPower = power) =>
      t(`abilities.${id}`, abilityParams(number, id, power, healPower)),
    synergyName: (id: SynergyId) => t(`synergies.${id}.name`),
    synergyNeed: (id: SynergyId) => t(`synergyNeeds.${id}`),
    synergyEffect: (id: SynergyId) =>
      t(
        `synergies.${id}.effect`,
        modifierParams(number, Object.assign({}, ...SYNERGY_BY_ID[id].effects.map((e) => e.modifiers))),
      ),
    itemName: (id: ItemId) => ITEMS[id].name,
    itemDescription: (id: ItemId) => t(`items.${id}`, itemParams(number, id)),
    slotName: (slot: LaneId | StructureSlot) => t(`lanes.${slot}`),
    errorText: (error: DomainError) =>
      error.code === 'boardFull'
        ? t('errors.boardFull', { capacity: error.capacity }, error.capacity)
        : t(`errors.${error.code}`),
  }
}
