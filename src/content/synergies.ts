import type { LaneId, RoleId, SynergyId } from './ids'
import type { StatModifiers } from './modifiers'

export interface LaneComposition {
  readonly lane: LaneId
  readonly roles: readonly RoleId[]
}

export interface SynergyEffect {
  readonly appliesTo: RoleId | 'all'
  readonly modifiers: Partial<StatModifiers>
}

export interface SynergyDefinition {
  readonly id: SynergyId
  readonly color: number
  readonly isActive: (composition: LaneComposition) => boolean
  readonly effects: readonly SynergyEffect[]
}

const count = (c: LaneComposition, role: RoleId) => c.roles.filter((r) => r === role).length
const has = (c: LaneComposition, role: RoleId) => count(c, role) > 0

export const SYNERGIES: readonly SynergyDefinition[] = [
  {
    id: 'guardian',
    color: 0xf4c55b,
    isActive: (c) => has(c, 'carry') && has(c, 'support'),
    effects: [
      {
        appliesTo: 'carry',
        modifiers: { attackSpeed: 1.35 },
      },
    ],
  },
  {
    id: 'setup',
    color: 0xb89cff,
    isActive: (c) => has(c, 'initiator') && has(c, 'mage'),
    effects: [
      {
        appliesTo: 'mage',
        modifiers: { spellPower: 1.4 },
      },
    ],
  },
  {
    id: 'soloMid',
    color: 0x6cc4ff,
    isActive: (c) => c.lane === 'mid' && c.roles.length === 1,
    effects: [
      {
        appliesTo: 'all',
        modifiers: {
          damage: 1.3,
          manaGain: 2,
        },
      },
    ],
  },
  {
    id: 'trilane',
    color: 0x7fe0b4,
    isActive: (c) => c.roles.length >= 3,
    effects: [
      {
        appliesTo: 'all',
        modifiers: { maxHp: 1.25 },
      },
    ],
  },
  {
    id: 'siege',
    color: 0xd7b98a,
    isActive: (c) => has(c, 'pusher') && has(c, 'carry'),
    effects: [
      {
        appliesTo: 'all',
        modifiers: { structureDamage: 1.5 },
      },
    ],
  },
  {
    id: 'hunt',
    color: 0xff86b0,
    isActive: (c) => has(c, 'ganker') && has(c, 'initiator'),
    effects: [
      {
        appliesTo: 'ganker',
        modifiers: { damage: 1.25 },
      },
      {
        appliesTo: 'initiator',
        modifiers: { damage: 1.25 },
      },
    ],
  },
  {
    id: 'arcane',
    color: 0x8fd6ff,
    isActive: (c) => count(c, 'mage') >= 2,
    effects: [
      {
        appliesTo: 'mage',
        modifiers: {
          spellPower: 1.25,
          manaGain: 1.2,
        },
      },
    ],
  },
  {
    id: 'bulwark',
    color: 0xff9e66,
    isActive: (c) => has(c, 'support') && has(c, 'initiator'),
    effects: [
      {
        appliesTo: 'all',
        modifiers: {
          maxHp: 1.15,
          damageTaken: 0.9,
        },
      },
    ],
  },
]

export const SYNERGY_BY_ID: Readonly<Record<SynergyId, SynergyDefinition>> = Object.fromEntries(
  SYNERGIES.map((s) => [s.id, s]),
) as Record<SynergyId, SynergyDefinition>
