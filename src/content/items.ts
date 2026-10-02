import type { ItemId, RoleId } from './ids'
import { combineModifiers, type StatModifiers } from './modifiers'
import { ROLES } from './roles'

export interface ItemEffects {
  /** Share of attack damage returned as healing. */
  readonly lifesteal?: number
  /** Share of ability damage returned as healing; spells often hit several targets at once, so it is lower. */
  readonly spellLifesteal?: number
  /** Share of received attack damage sent back to the attacker. */
  readonly thorns?: number
  /** Health share restored once per round instead of dying. */
  readonly revive?: number
  /** Nominal chance for an attack to crit; the battle rolls it with a pseudo-random distribution. */
  readonly critChance?: number
  /** Damage multiplier of a critical strike. */
  readonly critMultiplier?: number
}

export interface ItemDefinition {
  readonly id: ItemId
  /** Item names are proper names and are not translated. */
  readonly name: string
  readonly cost: number
  readonly modifiers: Partial<StatModifiers>
  readonly effects: ItemEffects
}

const item = (
  id: ItemId,
  name: string,
  cost: number,
  modifiers: Partial<StatModifiers>,
  effects: ItemEffects = {},
) => ({
  id,
  name,
  cost,
  modifiers,
  effects,
})

export const ITEMS: Readonly<Record<ItemId, ItemDefinition>> = {
  broadsword: item(
    'broadsword',
    'Broadsword',
    3,
    {},
    {
      critChance: 0.2,
      critMultiplier: 2,
    },
  ),
  gloves: item('gloves', 'Gloves of Fury', 3, { attackSpeed: 1.2 }),
  chainmail: item('chainmail', 'Chainmail', 3, { damageTaken: 0.85 }),
  vitality: item('vitality', 'Vitality Orb', 3, { maxHp: 1.25 }),
  boots: item('boots', 'Boots of Speed', 2, { speed: 1.25 }),
  staff: item('staff', 'Mage Staff', 4, { spellPower: 1.5 }),
  chalice: item('chalice', 'Sacred Chalice', 3, { healPower: 1.35 }),
  manaStone: item('manaStone', 'Mana Stone', 3, { manaGain: 1.5 }),
  vampireFang: item(
    'vampireFang',
    'Vampire Fang',
    4,
    {},
    {
      lifesteal: 0.2,
      spellLifesteal: 0.1,
    },
  ),
  thornMail: item('thornMail', 'Thorn Mail', 4, { damageTaken: 0.95 }, { thorns: 0.3 }),
  aegis: item('aegis', 'Aegis', 6, {}, { revive: 0.6 }),
}

export const ITEM_SLOTS = 2
export const STASH_SIZE = 6
export const ITEM_SELL_RATIO = 0.5

/** Item haste follows the role, while mana, healing and durability remain useful to every role. */
export function itemModifiers(id: ItemId, role: RoleId): Partial<StatModifiers> {
  const modifiers = ITEMS[id].modifiers
  return {
    ...modifiers,
    ...(modifiers.attackSpeed !== undefined
      ? { attackSpeed: 1 + (modifiers.attackSpeed - 1) * ROLES[role].itemAttackSpeed }
      : {}),
    ...(modifiers.spellPower !== undefined
      ? { spellPower: 1 + (modifiers.spellPower - 1) * ROLES[role].itemSpellPower }
      : {}),
  }
}

/** Offensive bonuses add across slots; buying a duplicate no longer compounds its own benefit. */
export function loadoutModifiers(items: readonly ItemId[], role: RoleId): StatModifiers {
  const parts = items.map((id) => itemModifiers(id, role))
  const result = combineModifiers(...parts)
  for (const key of ['attackSpeed', 'spellPower', 'manaGain'] as const) {
    result[key] = 1 + parts.reduce((sum, modifiers) => sum + (modifiers[key] ?? 1) - 1, 0)
  }

  return result
}
