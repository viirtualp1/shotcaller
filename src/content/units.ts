export type CreepVariant = 'melee' | 'ranged' | 'siege'
export type StructureType = 'tower' | 'throne'

export interface CreepStats {
  readonly hp: number
  readonly damage: number
  readonly attackInterval: number
  readonly range: number
  readonly aggroRange: number
  readonly speed: number
  readonly armor: number
  readonly structureDamage: number
  readonly radius: number
  readonly prefersStructures: boolean
}

export const CREEPS: Readonly<Record<CreepVariant, CreepStats>> = {
  melee: {
    hp: 290,
    damage: 16,
    attackInterval: 1,
    range: 0,
    aggroRange: 120,
    speed: 70,
    armor: 0.1,
    structureDamage: 0.5,
    radius: 6.5,
    prefersStructures: false,
  },
  ranged: {
    hp: 190,
    damage: 20,
    attackInterval: 1.25,
    range: 115,
    aggroRange: 150,
    speed: 70,
    armor: 0,
    structureDamage: 0.5,
    radius: 5.5,
    prefersStructures: false,
  },
  siege: {
    hp: 380,
    damage: 40,
    attackInterval: 2.2,
    range: 170,
    aggroRange: 185,
    speed: 60,
    armor: 0.2,
    structureDamage: 2,
    radius: 7.5,
    prefersStructures: true,
  },
}

export interface StructureStats {
  readonly hp: number
  readonly damage: number
  readonly attackInterval: number
  readonly range: number
  readonly armor: number
  readonly radius: number
}

export const STRUCTURES: Readonly<Record<StructureType, StructureStats>> = {
  tower: { hp: 1600, damage: 75, attackInterval: 1, range: 150, armor: 0.3, radius: 13 },
  throne: { hp: 3000, damage: 95, attackInterval: 1, range: 165, armor: 0.3, radius: 20 },
}
