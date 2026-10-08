export const ABILITY_PARAMS = {
  packCall: {
    triggerRadius: 300,
    count: 3,
    maxAlive: 6,
    hp: 180,
    damage: 22,
    lifetime: 10,
    speed: 125,
  },
  starfall: {
    damage: 170,
    stun: 0.6,
  },
  reap: {
    radius: 240,
    threshold: 0.2,
    damage: 190,
  },
  charge: {
    radius: 260,
    damage: 120,
    stun: 1.2,
    /** Enemy heroes this close to the target take `splashDamage` too; none without the talent. */
    splash: 0,
    splashDamage: 0,
  },
  volley: {
    arrows: 3,
    rangeBonus: 80,
    damage: 70,
    speed: 600,
  },
  prayer: {
    radius: 280,
    heal: 150,
    hpThreshold: 0.8,
    targets: 1,
  },
  barrel: {
    radius: 75,
    damage: 110,
    structureBonus: 2,
    rangeBonus: 60,
  },
  chainLightning: {
    rangeBonus: 80,
    bounces: 4,
    bounceRange: 150,
    damage: 110,
    falloff: 0.8,
  },
  poisonDagger: {
    radius: 320,
    damage: 70,
    poison: 25,
    tick: 0.5,
    duration: 4,
    slow: 0.3,
  },
  backstab: {
    radius: 320,
    fallbackRadius: 160,
    damage: 190,
  },
  fireball: {
    rangeBonus: 60,
    radius: 70,
    damage: 85,
    speed: 380,
  },
  roots: {
    searchRadius: 240,
    radius: 110,
    duration: 2,
    damage: 100,
    heal: 110,
    healRadius: 200,
  },
  whirl: {
    triggerRadius: 90,
    radius: 85,
    duration: 1.6,
    tick: 0.4,
    damage: 40,
  },
  leap: {
    searchRadius: 200,
    radius: 90,
    damage: 100,
    stun: 1.1,
  },
  raiseDead: {
    triggerRadius: 260,
    count: 2,
    /** More mana only refreshes the army faster; it never grows past this. */
    maxAlive: 4,
    hp: 260,
    damage: 22,
    lifetime: 12,
  },
  blizzard: {
    rangeBonus: 100,
    radius: 90,
    duration: 4,
    tick: 0.5,
    damage: 16,
    slow: 0.4,
  },
  quake: {
    radius: 140,
    damage: 140,
    stun: 1.6,
    minTargets: 3,
  },
  turret: {
    triggerRadius: 300,
    hp: 320,
    damage: 28,
    range: 150,
    attackInterval: 0.8,
    lifetime: 10,
  },
  hook: {
    radius: 260,
    minDistance: 70,
    damage: 210,
    stun: 1.5,
  },
  assassinate: {
    radius: 480,
    damage: 260,
    speed: 700,
  },
  shield: {
    radius: 300,
    absorb: 380,
    duration: 6,
    targets: 2,
  },
  standard: {
    triggerRadius: 260,
    /** Allies within this distance of the banner get the effect of their lane's order. */
    radius: 170,
    hp: 300,
    lifetime: 9,
    /** Push: allied creeps and summons attack faster and hit buildings harder. */
    pushAttackSpeed: 1.2,
    pushStructureDamage: 1.35,
    /** Hold: allied towers and the throne take less damage. */
    holdProtection: 0.6,
    /** Group: allied heroes deal more damage, and the banner stuns enemies where it lands. */
    groupDamage: 1.25,
    stun: 1.2,
    stunRadius: 140,
    /** No order: allied heroes take a little less damage. */
    guard: 0.9,
  },
  mend: {
    /** How far from the Stonewright a damaged tower or throne can be. */
    radius: 260,
    /** Buildings above this share of health are left alone. */
    threshold: 0.97,
    duration: 3,
    tick: 0.5,
    /** Health restored per second, grown by the same round scaling as the damage buildings take. */
    repair: 50,
  },
  /**
   * The borrowed ability is cast `borrowed` times as strong as its tier-one owner casts it, as befits a rare
   * tier-three hero; `power` is what the Perfect Copy talent adds on top.
   */
  mimic: {
    power: 1,
    borrowed: 1.6,
  },
} as const

export type AbilityParams = typeof ABILITY_PARAMS

/** Ability names are proper names and are not translated. */
export const ABILITY_NAMES: Readonly<Record<keyof AbilityParams, string>> = {
  packCall: 'Call of the Pack',
  starfall: 'Starfall',
  reap: 'Reaping',
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
  standard: 'Battle Standard',
  mend: 'Mend',
  mimic: 'Mimicry',
}
