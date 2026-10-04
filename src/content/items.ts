import type { ItemId, RoleId, ShopItemId, UpgradedItemId } from './ids'
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
  /** Attack damage per soul; the wearer keeps one soul per hero kill from round to round. */
  readonly soulDamage?: number
  readonly soulMax?: number
  /** Share of damage passed to the other bonded hero of the lane, who takes it with its own protection. */
  readonly bond?: number
  /** The bond holds while the pair stands this close. */
  readonly bondRange?: number
  /** The ability goes off a second time, this much weaker, after `echoDelay` seconds; its stuns are as short. */
  readonly echo?: number
  readonly echoDelay?: number
  /** Once a round the wearer travels to an allied tower under attack below this share of health… */
  readonly portal?: number
  /** …if the tower is at least this far away. */
  readonly portalDistance?: number
  /** Damage to the wearer's own throne every time the wearer dies; it counts for the enemy in the round. Flat in every round. */
  readonly curse?: number
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

const SHOP_ITEMS: Readonly<Record<ShopItemId, ItemDefinition>> = {
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
  soulJar: item(
    'soulJar',
    'Soul Jar',
    4,
    {},
    {
      soulDamage: 0.04,
      soulMax: 10,
    },
  ),
  soulbond: item(
    'soulbond',
    'Soulbond',
    3,
    {},
    {
      bond: 0.35,
      bondRange: 320,
    },
  ),
  echoShard: item(
    'echoShard',
    'Echo Shard',
    4,
    { manaGain: 0.8 },
    {
      echo: 0.5,
      echoDelay: 1.5,
    },
  ),
  townPortal: item(
    'townPortal',
    'Town Portal',
    2,
    {},
    {
      portal: 0.65,
      portalDistance: 250,
    },
  ),
  cursedBlade: item(
    'cursedBlade',
    'Cursed Blade',
    4,
    {
      damage: 1.4,
      attackSpeed: 1.15,
    },
    { curse: 80 },
  ),
}

type Upgrade = Pick<ItemDefinition, 'modifiers' | 'effects'>

/**
 * What two copies of an item merge into. Every number is written out, so a later change to the plain item does not
 * quietly change its upgrade too.
 */
const UPGRADES: Readonly<Record<ShopItemId, Upgrade>> = {
  broadsword: {
    modifiers: {},
    effects: {
      critChance: 0.3,
      critMultiplier: 2.25,
    },
  },
  gloves: {
    modifiers: { attackSpeed: 1.4 },
    effects: {},
  },
  chainmail: {
    modifiers: { damageTaken: 0.72 },
    effects: {},
  },
  vitality: {
    modifiers: { maxHp: 1.45 },
    effects: {},
  },
  boots: {
    modifiers: { speed: 1.4 },
    effects: {},
  },
  staff: {
    modifiers: { spellPower: 1.9 },
    effects: {},
  },
  chalice: {
    modifiers: { healPower: 1.65 },
    effects: {},
  },
  manaStone: {
    modifiers: { manaGain: 1.9 },
    effects: {},
  },
  vampireFang: {
    modifiers: {},
    effects: {
      lifesteal: 0.32,
      spellLifesteal: 0.16,
    },
  },
  thornMail: {
    modifiers: { damageTaken: 0.9 },
    effects: { thorns: 0.5 },
  },
  aegis: {
    modifiers: {},
    effects: { revive: 1 },
  },
  soulJar: {
    modifiers: {},
    effects: {
      soulDamage: 0.06,
      soulMax: 10,
    },
  },
  soulbond: {
    modifiers: {},
    effects: {
      bond: 0.5,
      bondRange: 420,
    },
  },
  echoShard: {
    modifiers: { manaGain: 0.9 },
    effects: {
      echo: 0.75,
      echoDelay: 1.5,
    },
  },
  townPortal: {
    modifiers: {},
    effects: {
      portal: 0.8,
      portalDistance: 150,
    },
  },
  cursedBlade: {
    modifiers: {
      damage: 1.75,
      attackSpeed: 1.25,
    },
    effects: { curse: 80 },
  },
}

export const isUpgraded = (id: ItemId): id is UpgradedItemId => id.endsWith('+')

/** The shop item an item was made from; a shop item is its own base. */
export const baseItemOf = (id: ItemId) => (isUpgraded(id) ? id.slice(0, -1) : id) as ShopItemId

export const upgradeOf = (id: ShopItemId): UpgradedItemId => `${id}+`

/** An upgrade is worth both copies that went into it, so selling or merging never makes or loses gold. */
export const ITEMS: Readonly<Record<ItemId, ItemDefinition>> = Object.fromEntries(
  Object.values(SHOP_ITEMS).flatMap((plain) => [
    [plain.id, plain],
    [
      upgradeOf(plain.id as ShopItemId),
      {
        ...plain,
        ...UPGRADES[plain.id as ShopItemId],
        id: upgradeOf(plain.id as ShopItemId),
        name: `${plain.name}+`,
        cost: plain.cost * 2,
      },
    ],
  ]),
) as Record<ItemId, ItemDefinition>

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
  for (const key of ['damage', 'attackSpeed', 'spellPower', 'manaGain'] as const) {
    result[key] = 1 + parts.reduce((sum, modifiers) => sum + (modifiers[key] ?? 1) - 1, 0)
  }

  return result
}
