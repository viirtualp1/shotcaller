export const LANE_IDS = ['top', 'mid', 'bot'] as const
export type LaneId = (typeof LANE_IDS)[number]

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

export const ITEM_IDS = [
  'broadsword',
  'gloves',
  'chainmail',
  'vitality',
  'boots',
  'staff',
  'manaStone',
  'vampireFang',
  'thornMail',
  'aegis',
] as const

export type ItemId = (typeof ITEM_IDS)[number]

export type Tier = 1 | 2 | 3
export type StarLevel = 1 | 2 | 3
export type CoachLevel = 2 | 3 | 4 | 5
export type StructureSlot = LaneId | 'throne'
