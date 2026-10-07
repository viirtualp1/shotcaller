import { describe, expect, it } from 'vitest'
import { ABILITY_PARAMS } from '@/content/abilities'
import { ABILITY_IDS } from '@/content/ids'
import { abilityValueKind } from '@/ui/abilityValueKinds'

describe('ability value meanings', () => {
  it('classifies every current ability parameter so new values cannot silently lose their meaning', () => {
    for (const ability of ABILITY_IDS) {
      for (const parameter of Object.keys(ABILITY_PARAMS[ability])) {
        expect(abilityValueKind(ability, parameter), `${ability}.${parameter}`).not.toBeNull()
      }
    }
  })

  it('distinguishes physical dagger hits, magical poison and summon attacks', () => {
    expect(abilityValueKind('poisonDagger', 'damage')).toBe('physicalDamage')
    expect(abilityValueKind('poisonDagger', 'poison')).toBe('magicalDamage')
    expect(abilityValueKind('volley', 'damage')).toBe('magicalDamage')
    expect(abilityValueKind('whirl', 'damage')).toBe('magicalDamage')
    expect(abilityValueKind('turret', 'damage')).toBe('physicalDamage')
    expect(abilityValueKind('raiseDead', 'damage')).toBe('physicalDamage')
  })
})
