import type { RoleId } from './ids'
import type { StatModifiers } from './modifiers'

export interface RoleDefinition {
  readonly id: RoleId
  readonly color: number
  readonly modifiers: Partial<StatModifiers>
  /** Share of attack-speed bonuses from items; offensive gear must preserve the hero's role. */
  readonly itemAttackSpeed: number
  /** Offensive casters get the full item bonus to ability power. */
  readonly itemSpellPower: number
  readonly farm?: { readonly perLastHit: number; readonly max: number; readonly perHeroKill: number }
  readonly healAura?: { readonly radius: number; readonly hpPercentPerSecond: number }
  readonly startingManaRatio?: number
  readonly laneCreepDamageBonus?: number
  readonly roams?: boolean
  readonly ignoresStructures?: boolean
  /** Nominal chance to dodge an attack; the battle rolls it with a pseudo-random distribution. */
  readonly evasion?: number
}

export const ROLES: Readonly<Record<RoleId, RoleDefinition>> = {
  carry: {
    id: 'carry',
    color: 0xf4c55b,
    modifiers: {},
    itemAttackSpeed: 1,
    itemSpellPower: 0.6,
    farm: {
      perLastHit: 0.03,
      max: 0.6,
      perHeroKill: 2,
    },
  },
  support: {
    id: 'support',
    color: 0x7fe0b4,
    modifiers: {},
    itemAttackSpeed: 0.4,
    itemSpellPower: 0.6,
    healAura: {
      radius: 200,
      hpPercentPerSecond: 0.018,
    },
  },
  mage: {
    id: 'mage',
    color: 0xb89cff,
    modifiers: { manaGain: 1.5 },
    itemAttackSpeed: 0.4,
    itemSpellPower: 1,
  },
  initiator: {
    id: 'initiator',
    color: 0xff9e66,
    modifiers: {},
    startingManaRatio: 0.5,
    itemAttackSpeed: 0.4,
    itemSpellPower: 0.6,
  },
  pusher: {
    id: 'pusher',
    color: 0xd7b98a,
    modifiers: { structureDamage: 2.5 },
    itemAttackSpeed: 0.75,
    itemSpellPower: 1,
    laneCreepDamageBonus: 0.25,
  },
  ganker: {
    id: 'ganker',
    color: 0xff86b0,
    modifiers: { speed: 1.15 },
    itemAttackSpeed: 1,
    itemSpellPower: 0.6,
    roams: true,
    ignoresStructures: true,
    evasion: 0.2,
  },
}
