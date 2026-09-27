export const ABILITY_PARAMS = {
  charge: { radius: 260, damage: 90, stun: 1.2 },
  volley: { arrows: 3, rangeBonus: 80, damage: 70, speed: 600 },
  prayer: { radius: 280, heal: 180, hpThreshold: 0.8 },
  barrel: { radius: 75, damage: 110, structureBonus: 2, rangeBonus: 60 },
  chainLightning: { rangeBonus: 80, bounces: 4, bounceRange: 150, damage: 110, falloff: 0.8 },
  poisonDagger: { radius: 320, damage: 70, poison: 25, tick: 0.5, duration: 4, slow: 0.3 },
  backstab: { radius: 320, fallbackRadius: 160, damage: 190 },
  fireball: { rangeBonus: 100, radius: 80, damage: 155, speed: 380 },
  roots: { searchRadius: 160, radius: 110, duration: 2, damage: 80, heal: 80, healRadius: 170 },
  whirl: { triggerRadius: 90, radius: 85, duration: 2, tick: 0.4, damage: 45 },
  leap: { searchRadius: 320, radius: 90, damage: 100, stun: 1.1 },
  raiseDead: { triggerRadius: 260, count: 2, hp: 260, damage: 22, lifetime: 12 },
  blizzard: { rangeBonus: 120, radius: 100, duration: 4, tick: 0.5, damage: 25, slow: 0.4 },
  quake: { radius: 140, damage: 140, stun: 1.6, minTargets: 3 },
  turret: { triggerRadius: 300, hp: 420, damage: 34, range: 150, attackInterval: 0.8, lifetime: 12 },
  hook: { radius: 380, minDistance: 70, damage: 170, stun: 1.2 },
  assassinate: { radius: 480, damage: 260, speed: 700 },
  shield: { radius: 300, absorb: 260, duration: 5 },
} as const

export type AbilityParams = typeof ABILITY_PARAMS

/** Ability names are proper names and are not translated. */
export const ABILITY_NAMES: Readonly<Record<keyof AbilityParams, string>> = {
  charge: 'Charge',
  volley: 'Volley',
  prayer: 'Prayer',
  barrel: 'Powder Keg',
  chainLightning: 'Chain Lightning',
  poisonDagger: 'Poison Dagger',
  backstab: 'Backstab',
  fireball: 'Fireball',
  roots: 'Entangling Roots',
  whirl: 'Whirlwind',
  leap: 'Leap',
  raiseDead: 'Raise Dead',
  blizzard: 'Blizzard',
  quake: 'Earthquake',
  turret: 'Turret',
  hook: 'Meat Hook',
  assassinate: 'Assassinate',
  shield: 'Arcane Shield',
}
