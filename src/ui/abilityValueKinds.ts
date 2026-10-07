import type { AbilityId } from '@/content/ids'

export type AbilityValueKind =
  | 'physicalDamage'
  | 'magicalDamage'
  | 'health'
  | 'healing'
  | 'shield'
  | 'duration'
  | 'interval'
  | 'range'
  | 'count'
  | 'speed'
  | 'slow'
  | 'damageBonus'
  | 'damageReduction'
  | 'strength'

/** Damage dealt by the ability, including the basic attacks of its summons. */
const DAMAGE_KINDS: Partial<Record<AbilityId, 'physicalDamage' | 'magicalDamage'>> = {
  charge: 'magicalDamage',
  volley: 'magicalDamage',
  barrel: 'magicalDamage',
  chainLightning: 'magicalDamage',
  poisonDagger: 'physicalDamage',
  backstab: 'physicalDamage',
  fireball: 'magicalDamage',
  roots: 'magicalDamage',
  whirl: 'magicalDamage',
  leap: 'magicalDamage',
  raiseDead: 'physicalDamage',
  blizzard: 'magicalDamage',
  quake: 'magicalDamage',
  turret: 'physicalDamage',
  hook: 'magicalDamage',
  assassinate: 'physicalDamage',
}

const PARAMETER_KINDS: Readonly<Record<string, AbilityValueKind>> = {
  hp: 'health',
  hpThreshold: 'health',
  threshold: 'health',
  heal: 'healing',
  repair: 'healing',
  absorb: 'shield',
  lifetime: 'duration',
  duration: 'duration',
  stun: 'duration',
  tick: 'interval',
  attackInterval: 'interval',
  radius: 'range',
  splash: 'range',
  range: 'range',
  rangeBonus: 'range',
  bounceRange: 'range',
  fallbackRadius: 'range',
  minDistance: 'range',
  searchRadius: 'range',
  triggerRadius: 'range',
  healRadius: 'range',
  stunRadius: 'range',
  arrows: 'count',
  bounces: 'count',
  targets: 'count',
  count: 'count',
  maxAlive: 'count',
  minTargets: 'count',
  speed: 'speed',
  pushAttackSpeed: 'speed',
  slow: 'slow',
  structureBonus: 'damageBonus',
  pushStructureDamage: 'damageBonus',
  groupDamage: 'damageBonus',
  guard: 'damageReduction',
  holdProtection: 'damageReduction',
  falloff: 'damageReduction',
  power: 'strength',
  borrowed: 'strength',
}

export function abilityValueKind(ability: AbilityId, parameter: string): AbilityValueKind | null {
  if (parameter === 'damage' || parameter === 'splashDamage') {
    return DAMAGE_KINDS[ability] ?? null
  }

  // The dagger's initial hit is physical; its poison ticks deal magical damage.
  if (parameter === 'poison') {
    return 'magicalDamage'
  }

  return PARAMETER_KINDS[parameter] ?? null
}
