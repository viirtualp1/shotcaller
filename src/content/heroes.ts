import type { AbilityId, HeroId, RoleId, Tier } from './ids'

export interface HeroStats {
  readonly hp: number
  readonly damage: number
  readonly attackInterval: number
  /** 0 means melee */
  readonly range: number
  readonly speed: number
  readonly armor: number
  readonly mana: number
}

/** Innate on-attack stun; the battle rolls the chance with a pseudo-random distribution. */
export interface HeroBash {
  readonly chance: number
  readonly stun: number
}

export interface HeroDefinition {
  readonly id: HeroId
  /** Proper names stay in English in every language, like hero names in Dota. */
  readonly name: string
  readonly tier: Tier
  readonly role: RoleId
  readonly color: number
  readonly ability: AbilityId
  readonly stats: HeroStats
  readonly bash?: HeroBash
}

type Row = [name: string, tier: Tier, role: RoleId, color: number, ability: AbilityId, stats: HeroStats]

const stats = (
  hp: number,
  damage: number,
  attackInterval: number,
  range: number,
  speed: number,
  armor: number,
  mana: number,
) => ({
  hp,
  damage,
  attackInterval,
  range,
  speed,
  armor,
  mana,
})

const TABLE: Readonly<Record<HeroId, Row>> = {
  spearman: ['Spearman', 1, 'initiator', 0xc9824a, 'charge', stats(780, 40, 1.1, 0, 95, 0.2, 80)],
  archer: ['Archer', 1, 'carry', 0x9bcf53, 'volley', stats(420, 40, 0.9, 150, 90, 0.05, 100)],
  acolyte: ['Acolyte', 1, 'support', 0xe8d9a0, 'prayer', stats(440, 26, 1.2, 140, 90, 0.05, 70)],
  sapper: ['Sapper', 1, 'pusher', 0xb58b5a, 'barrel', stats(470, 32, 1.3, 130, 88, 0.08, 90)],
  shaman: ['Storm Shaman', 1, 'mage', 0x6fb3ff, 'chainLightning', stats(420, 28, 1.2, 140, 88, 0.05, 80)],
  rogue: ['Rogue', 1, 'ganker', 0x7fbf8f, 'poisonDagger', stats(500, 40, 0.85, 0, 108, 0.1, 70)],
  shade: ['Shade', 2, 'ganker', 0x8a76c4, 'backstab', stats(580, 46, 0.8, 0, 110, 0.1, 70)],
  pyromancer: ['Pyromancer', 2, 'mage', 0xff7a3d, 'fireball', stats(430, 30, 1.2, 150, 88, 0.05, 100)],
  warden: ['Warden', 2, 'support', 0x5fae6e, 'roots', stats(680, 34, 1.2, 0, 92, 0.2, 100)],
  blademaster: ['Blademaster', 2, 'carry', 0xd8dde6, 'whirl', stats(640, 50, 0.85, 0, 100, 0.15, 90)],
  packLeader: ['Pack Leader', 2, 'initiator', 0x9b7b5b, 'leap', stats(820, 44, 1.15, 0, 100, 0.2, 90)],
  necromancer: ['Necromancer', 2, 'pusher', 0x9fd0a0, 'raiseDead', stats(480, 32, 1.3, 140, 88, 0.06, 100)],
  frostWitch: ['Frost Witch', 3, 'mage', 0x8fd6ff, 'blizzard', stats(520, 38, 1.1, 150, 88, 0.06, 100)],
  giant: ['Giant', 3, 'initiator', 0xa7a08f, 'quake', stats(1000, 54, 1.3, 0, 90, 0.25, 110)],
  engineer: ['Engineer', 3, 'pusher', 0xe0b43c, 'turret', stats(560, 42, 1.1, 150, 88, 0.1, 80)],
  butcher: ['Butcher', 3, 'ganker', 0xc4506a, 'hook', stats(1050, 64, 1.2, 0, 102, 0.18, 75)],
  sniper: ['Sniper', 3, 'carry', 0xc7b27a, 'assassinate', stats(480, 52, 1.1, 230, 86, 0.05, 100)],
  oracle: ['Oracle', 3, 'support', 0xe4d6ff, 'shield', stats(560, 40, 1.1, 150, 90, 0.08, 70)],
}

const BASHERS: Partial<Record<HeroId, HeroBash>> = {
  giant: {
    chance: 0.2,
    stun: 0.8,
  },
}

export const HEROES: Readonly<Record<HeroId, HeroDefinition>> = Object.fromEntries(
  Object.entries(TABLE).map(([id, [name, tier, role, color, ability, heroStats]]) => [
    id,
    {
      id: id as HeroId,
      name,
      tier,
      role,
      color,
      ability,
      stats: heroStats,
      bash: BASHERS[id as HeroId],
    },
  ]),
) as Record<HeroId, HeroDefinition>
