import type { RoleId } from './ids'
import type { StatModifiers } from './modifiers'

export interface RoleDefinition {
  readonly id: RoleId
  readonly color: number
  readonly modifiers: Partial<StatModifiers>
  readonly farm?: { readonly perLastHit: number; readonly max: number; readonly perHeroKill: number }
  readonly healAura?: { readonly radius: number; readonly hpPercentPerSecond: number }
  readonly startingManaRatio?: number
  readonly laneCreepDamageBonus?: number
  readonly roams?: boolean
}

export const ROLES: Readonly<Record<RoleId, RoleDefinition>> = {
  carry: {
    id: 'carry',
    color: 0xf4c55b,
    modifiers: {},
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
    healAura: {
      radius: 170,
      hpPercentPerSecond: 0.012,
    },
  },
  mage: {
    id: 'mage',
    color: 0xb89cff,
    modifiers: { manaGain: 1.5 },
  },
  initiator: {
    id: 'initiator',
    color: 0xff9e66,
    modifiers: {},
    startingManaRatio: 0.5,
  },
  pusher: {
    id: 'pusher',
    color: 0xd7b98a,
    modifiers: { structureDamage: 2.5 },
    laneCreepDamageBonus: 0.25,
  },
  ganker: {
    id: 'ganker',
    color: 0xff86b0,
    modifiers: { speed: 1.15 },
    roams: true,
  },
}
