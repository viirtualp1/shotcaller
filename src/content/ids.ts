export const LANE_IDS = ['top', 'mid', 'bot'] as const
export type LaneId = (typeof LANE_IDS)[number]

/** Orders a coach can give a lane before the fight; a lane without one is left to its heroes' judgement. */
export const LANE_STANCES = ['push', 'hold', 'group'] as const
export type LaneStance = (typeof LANE_STANCES)[number]

/** A lane's tower is named after it; the one-lane map adds a second tower closer to the throne. */
export const TOWER_SLOTS = ['top', 'mid', 'bot', 'inner'] as const
export type TowerSlot = (typeof TOWER_SLOTS)[number]

export const MODE_IDS = ['threeLanes', 'twoLanes', 'oneLane'] as const
export type ModeId = (typeof MODE_IDS)[number]

export type TeamId = 0 | 1
export const TEAM_IDS: readonly TeamId[] = [0, 1]
export const opponentOf = (team: TeamId) => (team === 0 ? 1 : 0)

export const ROLE_IDS = ['carry', 'support', 'mage', 'initiator', 'pusher', 'ganker'] as const
export type RoleId = (typeof ROLE_IDS)[number]

export const HERO_IDS = [
  'spearman',
  'archer',
  'acolyte',
  'sapper',
  'shaman',
  'rogue',
  'shade',
  'pyromancer',
  'warden',
  'blademaster',
  'packLeader',
  'necromancer',
  'frostWitch',
  'giant',
  'engineer',
  'butcher',
  'sniper',
  'oracle',
  'herald',
  'stonewright',
  'changeling',
] as const

export type HeroId = (typeof HERO_IDS)[number]

export const ABILITY_IDS = [
  'charge',
  'volley',
  'prayer',
  'barrel',
  'chainLightning',
  'poisonDagger',
  'backstab',
  'fireball',
  'roots',
  'whirl',
  'leap',
  'raiseDead',
  'blizzard',
  'quake',
  'turret',
  'hook',
  'assassinate',
  'shield',
  'standard',
  'mend',
  'mimic',
] as const

export type AbilityId = (typeof ABILITY_IDS)[number]

export const SYNERGY_IDS = [
  'guardian',
  'setup',
  'soloMid',
  'trilane',
  'siege',
  'hunt',
  'arcane',
  'bulwark',
] as const

export type SynergyId = (typeof SYNERGY_IDS)[number]

/** Every hero but the Changeling belongs to one; heroes of a faction on the same lane strengthen each other. */
export const FACTION_IDS = ['legion', 'wildkin', 'arcanum', 'grave', 'hearth'] as const

export type FactionId = (typeof FACTION_IDS)[number]

/** Items the shop sells. Two of the same merge into its upgraded version, whose id ends in `+`. */
export const SHOP_ITEM_IDS = [
  'broadsword',
  'gloves',
  'chainmail',
  'vitality',
  'boots',
  'staff',
  'chalice',
  'manaStone',
  'vampireFang',
  'thornMail',
  'aegis',
  'soulJar',
  'soulbond',
  'echoShard',
  'townPortal',
  'cursedBlade',
] as const

export type ShopItemId = (typeof SHOP_ITEM_IDS)[number]
export type UpgradedItemId = `${ShopItemId}+`
export type ItemId = ShopItemId | UpgradedItemId

/** Every item a hero can carry: the shop's, then their upgrades in the same order. */
export const ITEM_IDS = [
  ...SHOP_ITEM_IDS,
  ...SHOP_ITEM_IDS.map((id): UpgradedItemId => `${id}+`),
] as unknown as readonly [ItemId, ...ItemId[]]

export type Tier = 1 | 2 | 3
export type StarLevel = 1 | 2 | 3
/** Starts at 1; what each level allows depends on the game mode. */
export type CoachLevel = number
export type StructureSlot = TowerSlot | 'throne'
