import type { FactionId } from './ids'
import type { ItemEffects } from './items'
import type { StatModifiers } from './modifiers'

/** Heroes of one faction on the same lane needed for each step of its bonus. */
export const FACTION_TIERS = [2, 3] as const

export type FactionTier = (typeof FACTION_TIERS)[number]

/** Item passives a faction can grant; they stack with the hero's items as a third item would. */
export type FactionEffects = Pick<
  ItemEffects,
  'lifesteal' | 'thorns' | 'critChance' | 'critMultiplier' | 'echo' | 'echoDelay'
>

export interface FactionBonus {
  readonly modifiers: Partial<StatModifiers>
  readonly effects: FactionEffects
}

export interface FactionDefinition {
  readonly id: FactionId
  readonly color: number
  /** What every hero of the faction on the lane gets with two of them there, and with three or more. */
  readonly tiers: Readonly<Record<FactionTier, FactionBonus>>
}

export const FACTIONS: Readonly<Record<FactionId, FactionDefinition>> = {
  /* Soldiers who hold the line together. */
  legion: {
    id: 'legion',
    color: 0xd9a441,
    tiers: {
      2: {
        modifiers: { damageTaken: 0.88 },
        effects: {},
      },
      3: {
        modifiers: { damageTaken: 0.78 },
        effects: { thorns: 0.2 },
      },
    },
  },
  /* Beasts and rangers who run their prey down and feed on the hunt. */
  wildkin: {
    id: 'wildkin',
    color: 0x7fbf6a,
    tiers: {
      2: {
        modifiers: { speed: 1.1 },
        effects: { lifesteal: 0.1 },
      },
      3: {
        modifiers: { speed: 1.2 },
        effects: { lifesteal: 0.2 },
      },
    },
  },
  /* Spellcasters whose magic answers each other's. */
  arcanum: {
    id: 'arcanum',
    color: 0x8f9cff,
    tiers: {
      2: {
        modifiers: { manaGain: 1.1 },
        effects: {},
      },
      3: {
        modifiers: { manaGain: 1.2 },
        effects: {
          echo: 0.2,
          echoDelay: 1.5,
        },
      },
    },
  },
  /* Killers from the dark who strike where it hurts. */
  grave: {
    id: 'grave',
    color: 0xb06ad0,
    tiers: {
      2: {
        modifiers: {},
        effects: {
          critChance: 0.2,
          critMultiplier: 1.75,
        },
      },
      3: {
        modifiers: {},
        effects: {
          critChance: 0.35,
          critMultiplier: 2,
        },
      },
    },
  },
  /* Builders and keepers who bring walls down and patch their own up. */
  hearth: {
    id: 'hearth',
    color: 0xe07b4a,
    tiers: {
      2: {
        modifiers: {
          structureDamage: 1.3,
          healPower: 1.2,
        },
        effects: {},
      },
      3: {
        modifiers: {
          structureDamage: 1.6,
          healPower: 1.35,
          maxHp: 1.1,
        },
        effects: {},
      },
    },
  },
}

/** The step a faction reaches with this many of its heroes on one lane; null below the first. */
export const factionTier = (count: number): FactionTier | null => (count >= 3 ? 3 : count >= 2 ? 2 : null)
