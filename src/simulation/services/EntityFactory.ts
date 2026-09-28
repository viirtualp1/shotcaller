import type { World } from 'miniplex'
import { ABILITY_PARAMS } from '@/content/abilities'
import { HEROES } from '@/content/heroes'
import type { ItemId, LaneId, TeamId } from '@/content/ids'
import { ITEMS } from '@/content/items'
import { combineModifiers } from '@/content/modifiers'
import { ROLES } from '@/content/roles'
import { BATTLE, STAR_POWER } from '@/content/rules'
import { CREEPS, STRUCTURES, type CreepVariant, type StructureType } from '@/content/units'
import type { Vec2 } from '@/core/math/vec2'
import { createPrd } from '@/core/random/prd'
import type { Rng } from '@/core/random/rng'
import type { OwnedHero } from '@/domain/roster/Roster'
import type { LaneReport } from '@/domain/synergy/resolveLane'
import type { Entity, HeroUnit, ItemEffectsState, Projectile, Unit, Zone } from '../ecs/components'
import type { LaneMap } from '../map/LaneMap'

const SPAWN_JITTER = 4

const freshStatus = () => ({
  stun: 0,
  root: 0,
  slow: 0,
  slowFactor: 0,
})

function itemEffects(items: readonly ItemId[]) {
  return items.reduce<ItemEffectsState>(
    (acc, id) => {
      const effects = ITEMS[id].effects
      return {
        lifesteal: acc.lifesteal + (effects.lifesteal ?? 0),
        spellLifesteal: acc.spellLifesteal + (effects.spellLifesteal ?? 0),
        thorns: acc.thorns + (effects.thorns ?? 0),
        revive: Math.max(acc.revive, effects.revive ?? 0),
      }
    },
    {
      lifesteal: 0,
      spellLifesteal: 0,
      thorns: 0,
      revive: 0,
    },
  )
}

/** Crit chances from several items combine as independent rolls; the biggest multiplier wins. */
function itemCrit(items: readonly ItemId[]) {
  let noCrit = 1
  let multiplier = 1
  for (const id of items) {
    const { critChance = 0, critMultiplier = 1 } = ITEMS[id].effects
    if (critChance > 0) {
      noCrit *= 1 - critChance
      multiplier = Math.max(multiplier, critMultiplier)
    }
  }

  return noCrit < 1
    ? {
        chance: 1 - noCrit,
        multiplier,
      }
    : null
}

export interface CreepSpawn {
  readonly team: TeamId
  readonly lane: LaneId
  readonly variant: CreepVariant
  readonly along: number
  readonly strength: number
  readonly damageBonus: number
  readonly mega: boolean
}

export class EntityFactory {
  constructor(
    private readonly world: World<Entity>,
    private readonly map: LaneMap,
    private readonly rng: Rng,
  ) {}

  structure(team: TeamId, type: StructureType, lane: LaneId | null, hp: number) {
    const stats = STRUCTURES[type]
    const position = lane ? this.map.towerPosition(team, lane) : this.map.base(team)
    return this.world.add({
      team,
      kind: 'structure',
      position,
      radius: stats.radius,
      health: {
        current: hp,
        max: stats.hp,
      },
      armor: stats.armor,
      status: freshStatus(),
      attack: {
        damage: stats.damage,
        interval: stats.attackInterval,
        cooldown: 0,
        range: stats.range,
        ranged: true,
      },
      targeting: {
        aggroRange: stats.range,
        target: null,
        chasing: false,
        prefersStructures: false,
      },
      structure: {
        type,
        lane,
      },
      ...(stats.fountainHeal
        ? {
            healAura: {
              radius: stats.range,
              hpPercentPerSecond: stats.fountainHeal,
              timer: 0,
            },
          }
        : {}),
    }) as Unit
  }

  hero(owned: OwnedHero, team: TeamId, lane: LaneId, report: LaneReport, slot: number) {
    const definition = HEROES[owned.heroId]
    const role = ROLES[definition.role]
    const stats = definition.stats
    const star = STAR_POWER[owned.stars]

    const mods = combineModifiers(
      report.modifiersFor(definition.role),
      ...owned.items.map((item) => ITEMS[item].modifiers),
    )

    const maxHp = stats.hp * star * mods.maxHp
    const base = this.map.base(team)
    const crit = itemCrit(owned.items)
    return this.world.add({
      team,
      kind: 'hero',
      position: {
        x: base.x + (slot - 1) * 16,
        y: base.y + (slot % 2 ? 10 : -10),
      },
      color: definition.color,
      radius: BATTLE.hero.radius,
      health: {
        current: maxHp,
        max: maxHp,
      },
      armor: stats.armor,
      damageTaken: mods.damageTaken,
      itemEffects: itemEffects(owned.items),
      structureDamage: BATTLE.hero.structureDamage * mods.structureDamage,
      speed: stats.speed * mods.speed,
      status: freshStatus(),
      attack: {
        damage: stats.damage * star * mods.damage,
        interval: stats.attackInterval / mods.attackSpeed,
        cooldown: this.rng.range(0, 0.3),
        range: stats.range,
        ranged: stats.range > 0,
      },
      targeting: {
        aggroRange: Math.max(BATTLE.hero.aggroRange, stats.range + BATTLE.hero.aggroRangeBonus),
        target: null,
        chasing: false,
        prefersStructures: false,
      },
      laneFollower: {
        path: this.map.path(team, lane),
        waypoint: 1,
        avoidsTowers: true,
      },
      mana: {
        current: stats.mana * (role.startingManaRatio ?? 0),
        max: stats.mana,
        gain: mods.manaGain,
      },
      caster: {
        ability: definition.ability,
        power: star * mods.spellPower,
      },
      hero: {
        uid: owned.uid,
        heroId: owned.heroId,
        stars: owned.stars,
        role: definition.role,
        lane,
        items: [...owned.items],
        farmStacks: 0,
        kills: 0,
        deaths: 0,
        damageDealt: 0,
        damageReceived: 0,
        structureDamage: 0,
        healing: 0,
        lastHits: 0,
      },
      ...(role.roams
        ? {
            roamer: {
              thinkTimer: 0,
              quarry: null,
            },
          }
        : {}),
      ...(role.healAura
        ? {
            healAura: {
              ...role.healAura,
              timer: BATTLE.auraInterval,
            },
          }
        : {}),
      ...(crit
        ? {
            crit: {
              multiplier: crit.multiplier,
              prd: createPrd(this.rng, crit.chance),
            },
          }
        : {}),
      ...(definition.bash
        ? {
            bash: {
              stun: definition.bash.stun,
              prd: createPrd(this.rng, definition.bash.chance),
            },
          }
        : {}),
      ...(role.evasion ? { evasion: { prd: createPrd(this.rng, role.evasion) } } : {}),
    }) as HeroUnit
  }

  creep(spawn: CreepSpawn) {
    const stats = CREEPS[spawn.variant]
    const path = this.map.path(spawn.team, spawn.lane)
    const point = this.map.pointAt(path, spawn.along)
    const hp = stats.hp * spawn.strength
    return this.world.add({
      team: spawn.team,
      kind: 'creep',
      position: {
        x: point.x + this.rng.range(-SPAWN_JITTER, SPAWN_JITTER),
        y: point.y + this.rng.range(-SPAWN_JITTER, SPAWN_JITTER),
      },
      radius: stats.radius,
      health: {
        current: hp,
        max: hp,
      },
      armor: stats.armor,
      structureDamage: stats.structureDamage,
      speed: stats.speed,
      status: freshStatus(),
      attack: {
        damage: stats.damage * spawn.strength * (1 + spawn.damageBonus),
        interval: stats.attackInterval,
        cooldown: 0,
        range: stats.range,
        ranged: stats.range > 0,
      },
      targeting: {
        aggroRange: stats.aggroRange,
        target: null,
        chasing: false,
        prefersStructures: stats.prefersStructures,
      },
      laneFollower: {
        path,
        waypoint: this.map.segmentAt(path, spawn.along) + 1,
        avoidsTowers: false,
      },
      creep: {
        variant: spawn.variant,
        mega: spawn.mega,
      },
    }) as Unit
  }

  turret(owner: HeroUnit, position: Vec2) {
    const p = ABILITY_PARAMS.turret
    const power = owner.caster.power
    return this.world.add({
      team: owner.team,
      kind: 'turret',
      position,
      ...(owner.color !== undefined ? { color: owner.color } : {}),
      radius: 8,
      health: {
        current: p.hp * power,
        max: p.hp * power,
      },
      armor: 0.2,
      structureDamage: 1.5,
      status: freshStatus(),
      attack: {
        damage: p.damage * power,
        interval: p.attackInterval,
        cooldown: 0,
        range: p.range,
        ranged: true,
      },
      targeting: {
        aggroRange: p.range,
        target: null,
        chasing: false,
        prefersStructures: false,
      },
      owner,
      lifetime: p.lifetime,
    }) as Unit
  }

  skeleton(owner: HeroUnit, position: Vec2) {
    const p = ABILITY_PARAMS.raiseDead
    const power = owner.caster.power
    const path = this.map.path(owner.team, owner.hero.lane)
    const { segment } = this.map.project(path, position)
    return this.world.add({
      team: owner.team,
      kind: 'creep',
      position: { ...position },
      ...(owner.color !== undefined ? { color: owner.color } : {}),
      radius: 7,
      health: {
        current: p.hp * power,
        max: p.hp * power,
      },
      armor: 0.1,
      structureDamage: 1.2,
      speed: 80,
      status: freshStatus(),
      attack: {
        damage: p.damage * power,
        interval: 1,
        cooldown: 0,
        range: 0,
        ranged: false,
      },
      targeting: {
        aggroRange: 140,
        target: null,
        chasing: false,
        prefersStructures: false,
      },
      laneFollower: {
        path,
        waypoint: Math.min(segment + 1, path.points.length - 1),
        avoidsTowers: false,
      },
      creep: {
        variant: 'melee',
        mega: false,
        summoned: true,
      },
      owner,
      lifetime: p.lifetime,
    }) as Unit
  }

  projectile(spec: Projectile, color?: number) {
    return this.world.add({
      team: spec.source.team,
      position: { ...spec.source.position },
      ...(color !== undefined ? { color } : {}),
      projectile: spec,
    })
  }

  zone(center: Vec2, spec: Zone, color: number) {
    return this.world.add({
      team: spec.source.team,
      position: { ...center },
      color,
      zone: spec,
    })
  }
}
