import type { ItemId } from './ids'
import type { StatModifiers } from './modifiers'

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
  gloves: item('gloves', 'Gloves of Fury', 3, { attackSpeed: 1.25 }),
  chainmail: item('chainmail', 'Chainmail', 3, { damageTaken: 0.85 }),
  vitality: item('vitality', 'Vitality Orb', 3, { maxHp: 1.25 }),
  boots: item('boots', 'Boots of Speed', 2, { speed: 1.25 }),
  staff: item('staff', 'Mage Staff', 4, { spellPower: 1.2 }),
  manaStone: item('manaStone', 'Mana Stone', 3, { manaGain: 1.35 }),
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
