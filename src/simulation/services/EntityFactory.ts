import type { World } from 'miniplex'
import { HEROES } from '@/content/heroes'
import type { ItemId, LaneId, LaneStance, StructureSlot, TeamId, TowerSlot } from '@/content/ids'
import { ITEMS, loadoutModifiers, type ItemEffects } from '@/content/items'
import { combineModifiers } from '@/content/modifiers'
import { ROLES } from '@/content/roles'
import { BATTLE, STAR_POWER } from '@/content/rules'
import { SANDBOX, TRAINING_CAMPS } from '@/content/sandbox'
import { activeTalents, talentManaCost } from '@/content/talents'
import { CREEPS, STRUCTURES, type CreepVariant, type StructureType } from '@/content/units'
import type { Vec2 } from '@/core/math/vec2'
import { createPrd } from '@/core/random/prd'
import type { Rng } from '@/core/random/rng'
import type { OwnedHero } from '@/domain/roster/Roster'
import type { LaneReport } from '@/domain/synergy/resolveLane'
import type { Entity, HeroUnit, ItemEffectsState, Projectile, Unit, Zone } from '../ecs/components'
import type { TwistDefinition } from '@/content/experiments'
import type { LaneMap } from '../map/LaneMap'
import { paramsOf } from '../abilities/params'

const SPAWN_JITTER = 4

const freshStatus = () => ({
  stun: 0,
  root: 0,
  slow: 0,
  slowFactor: 0,
})

/** The passives a hero carries: its items', and its faction's as one more item. */
const passivesOf = (items: readonly ItemId[], extra: ItemEffects | null): readonly ItemEffects[] => [
  ...items.map((id) => ITEMS[id].effects),
  ...(extra ? [extra] : []),
]

/** Sustain adds up across slots; a second copy of any other effect does nothing more than the first. */
function itemEffects(passives: readonly ItemEffects[]) {
  return passives.reduce<ItemEffectsState>(
    (acc, effects) => {
      return {
        lifesteal: acc.lifesteal + (effects.lifesteal ?? 0),
        spellLifesteal: acc.spellLifesteal + (effects.spellLifesteal ?? 0),
        thorns: acc.thorns + (effects.thorns ?? 0),
        revive: Math.max(acc.revive, effects.revive ?? 0),
        soulDamage: Math.max(acc.soulDamage, effects.soulDamage ?? 0),
        soulMax: Math.max(acc.soulMax, effects.soulMax ?? 0),
        echo: Math.max(acc.echo, effects.echo ?? 0),
        echoDelay: Math.max(acc.echoDelay, effects.echoDelay ?? 0),
        portal: Math.max(acc.portal, effects.portal ?? 0),
        portalDistance: Math.max(acc.portalDistance, effects.portalDistance ?? 0),
        curse: Math.max(acc.curse, effects.curse ?? 0),
      }
    },
    {
      lifesteal: 0,
      spellLifesteal: 0,
      thorns: 0,
      revive: 0,
      soulDamage: 0,
      soulMax: 0,
      echo: 0,
      echoDelay: 0,
      portal: 0,
      portalDistance: 0,
      curse: 0,
    },
  )
}

/** Crit chances from several items combine as independent rolls; the biggest multiplier wins. */
function itemCrit(passives: readonly ItemEffects[]) {
  let noCrit = 1
  let multiplier = 1
  for (const { critChance = 0, critMultiplier = 1 } of passives) {
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
  /** `twist` is the round's experimental rule, the same for both sides. */
  constructor(
    private readonly world: World<Entity>,
    private readonly map: LaneMap,
    private readonly rng: Rng,
    private readonly twist: TwistDefinition | null = null,
  ) {}

  tower(team: TeamId, slot: TowerSlot, hp: number) {
    const lane = this.map.definition.towers[slot]?.lane ?? null
    return this.structure(team, 'tower', slot, lane, this.map.towerPosition(team, slot), hp)
  }

  throne(team: TeamId, hp: number) {
    return this.structure(team, 'throne', 'throne', null, this.map.base(team), hp)
  }

  /** A training dummy in the side camp assigned to its lane. */
  dummy(team: TeamId, lane: LaneId, index: number, count: number) {
    const [x, y] = TRAINING_CAMPS[this.map.mode][lane]!
    const across = (index - (count - 1) / 2) * SANDBOX.dummySpacing

    return this.world.add({
      team,
      kind: 'hero',
      position: {
        x: x + across,
        y,
      },
      radius: SANDBOX.dummyRadius,
      health: {
        current: SANDBOX.dummyHp,
        max: SANDBOX.dummyHp,
      },
      armor: 0,
      status: freshStatus(),
      dummy: true,
      dummyLane: lane,
    }) as Unit
  }

  private structure(
    team: TeamId,
    type: StructureType,
    slot: StructureSlot,
    lane: LaneId | null,
    position: Vec2,
    hp: number,
  ) {
    const stats = STRUCTURES[type]
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
      ...(this.twist?.structureDamageTaken ? { damageTaken: this.twist.structureDamageTaken } : {}),
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
        slot,
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

  hero(owned: OwnedHero, team: TeamId, lane: LaneId, report: LaneReport, slot: number, stance?: LaneStance) {
    const definition = HEROES[owned.heroId]
    const roleId = report.roles[slot] ?? definition.role
    const role = ROLES[roleId]
    const stats = definition.stats
    const star = STAR_POWER[owned.stars]
    const faction = report.factions.bonusFor(slot)
    const passives = passivesOf(owned.items, faction?.bonus.effects ?? null)
    const effects = itemEffects(passives)
    const talents = activeTalents(owned.stars, owned.talent)
    const manaCost = stats.mana * talentManaCost(definition.ability, talents)

    const mods = combineModifiers(
      report.modifiersFor(roleId),
      loadoutModifiers(owned.items, roleId),
      faction?.bonus.modifiers ?? {},
      this.twist?.heroes ?? {},
    )

    const range = stats.range * (stats.range > 0 ? (this.twist?.rangedReach ?? 1) : 1)

    const maxHp = stats.hp * star * mods.maxHp
    const base = this.map.base(team)
    const crit = itemCrit(passives)
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
      itemEffects: effects,
      structureDamage: BATTLE.hero.structureDamage * mods.structureDamage,
      speed: stats.speed * mods.speed,
      status: freshStatus(),
      attack: {
        damage: stats.damage * star * mods.damage,
        interval: stats.attackInterval / mods.attackSpeed,
        cooldown: this.rng.range(0, 0.3),
        range,
        ranged: range > 0,
      },
      targeting: {
        aggroRange: Math.max(BATTLE.hero.aggroRange, range + BATTLE.hero.aggroRangeBonus),
        target: null,
        chasing: false,
        prefersStructures: false,
        ignoresStructures: role.ignoresStructures ?? false,
      },
      laneFollower: {
        path: this.map.path(team, lane),
        waypoint: 1,
        avoidsTowers: true,
        stance,
      },
      mana: {
        current: manaCost * (role.startingManaRatio ?? 0),
        max: manaCost,
        gain: mods.manaGain,
        regen: definition.manaRegen ?? 0,
      },
      caster: {
        ability: definition.ability,
        power: star * mods.spellPower,
        healPower: star * mods.healPower,
        stunScale: 1,
        talents,
      },
      hero: {
        uid: owned.uid,
        heroId: owned.heroId,
        stars: owned.stars,
        role: roleId,
        lane,
        startLane: lane,
        /* Souls wait in the hero while it has no jar, and wake up when it gets one again. */
        souls: Math.min(owned.souls ?? 0, effects.soulMax || Infinity),
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
      /* An order keeps a ganker on its lane: it holds, pushes or stays together with the others there. */
      ...(role.roams && !stance
        ? {
            roamer: {
              thinkTimer: 0,
              quarry: null,
              farm: null,
            },
          }
        : {}),
      ...(role.healAura
        ? {
            healAura: {
              radius: role.healAura.radius,
              hpPercentPerSecond: role.healAura.hpPercentPerSecond * mods.healPower,
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
      structureDamage: stats.structureDamage * (this.twist?.creepSiege ?? 1),
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
    const p = paramsOf(owner, 'turret')
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
      ...(owner.training ? { training: owner.training } : {}),
      lifetime: p.lifetime,
    }) as Unit
  }

  skeleton(owner: HeroUnit, position: Vec2) {
    return this.summon(owner, position, paramsOf(owner, 'raiseDead'))
  }

  summon(
    owner: HeroUnit,
    position: Vec2,
    p: { hp: number; damage: number; lifetime: number; speed?: number },
  ) {
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
      speed: p.speed ?? 80,
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
      ...(owner.training ? { training: owner.training } : {}),
      lifetime: p.lifetime,
    }) as Unit
  }

  /** A Battle Standard: it has health and can be cut down, but never attacks or moves. */
  banner(owner: HeroUnit, position: Vec2) {
    const p = paramsOf(owner, 'standard')
    const hp = p.hp * owner.caster.power
    return this.world.add({
      team: owner.team,
      kind: 'turret',
      position: { ...position },
      ...(owner.color !== undefined ? { color: owner.color } : {}),
      radius: 7,
      health: {
        current: hp,
        max: hp,
      },
      armor: 0.2,
      status: freshStatus(),
      banner: {
        stance: owner.laneFollower?.stance ?? null,
        radius: p.radius,
      },
      owner,
      ...(owner.training ? { training: owner.training } : {}),
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
