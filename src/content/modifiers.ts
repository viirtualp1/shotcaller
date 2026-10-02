/** Every field is a multiplier. Item bonuses are combined before multiplying with roles and synergies. */
export interface StatModifiers {
  maxHp: number
  damage: number
  attackSpeed: number
  /** Ability damage and summons; healing and shields have their own multiplier. */
  spellPower: number
  /** Healing, shields and the support aura. */
  healPower: number
  manaGain: number
  speed: number
  structureDamage: number
  damageTaken: number
}

export const NEUTRAL_MODIFIERS: Readonly<StatModifiers> = Object.freeze({
  maxHp: 1,
  damage: 1,
  attackSpeed: 1,
  spellPower: 1,
  healPower: 1,
  manaGain: 1,
  speed: 1,
  structureDamage: 1,
  damageTaken: 1,
})

export function combineModifiers(...parts: Partial<StatModifiers>[]) {
  const result: StatModifiers = { ...NEUTRAL_MODIFIERS }
  for (const part of parts) {
    for (const key of Object.keys(part) as (keyof StatModifiers)[]) {
      result[key] *= part[key] ?? 1
    }
  }

  return result
}
