import { BATTLE } from '@/content/rules'
import { distance } from '@/core/math/vec2'
import { isAlive, isDisabled, type Unit } from '../ecs/components'
import { creditedHero } from '../services/CombatService'
import { withinLaneBand } from '../services/laneBand'
import { beyondCores, beyondHoldLine } from '../services/laneOrders'
import { isCaughtAlone } from '../services/skirmish'
import { isThroneNearlyDown } from '../services/TowerSafety'
import { trainingTargetAllowed } from '../services/training'
import { attackReach, attackSpot, inReach } from './AttackSystem'
import type { SimulationContext, System } from '../SimulationContext'

const PRIORITY = {
  structureIgnoresHeroes: 1000,
  creepAvoidsHeroes: 60,
  creepAvoidsStructures: 120,
  siegePrefersStructures: -150,
  heroPrefersHeroes: -50,
  heroStructurePenalty: 80,
  pushPrefersStructures: -150,
  roamerQuarry: -300,
  finishThrone: -400,
} as const

/** A hero already trading blows with another hero keeps its target if it is this close to reach. */
const REACH_SLACK = 10

export class TargetingSystem implements System {
  constructor(private readonly ctx: SimulationContext) {
    ctx.events.on('damaged', ({ target, source }) => this.remember(target, source))
  }

  update(dt: number) {
    for (const unit of this.ctx.queries.fighters) {
      if (unit.threat) {
        unit.threat.remaining -= dt
      }

      if (!isAlive(unit) || isDisabled(unit) || unit.defend) {
        continue
      }

      const targeting = unit.targeting
      if (unit.training?.goal === 'dummies') {
        targeting.target = this.ctx.queries.units.entities
          .filter((target) => target.dummy && isAlive(target) && trainingTargetAllowed(unit, target))
          .reduce<Unit | null>(
            (closest, target) =>
              !closest || distance(unit.position, target.position) < distance(unit.position, closest.position)
                ? target
                : closest,
            null,
          )

        targeting.chasing = targeting.target !== null

        continue
      }

      const siegeTarget = this.creepSiegeTarget(unit)
      if (siegeTarget) {
        targeting.target = siegeTarget
        targeting.chasing = true

        continue
      }

      const throne = this.throneToFinish(unit)
      if (!throne && this.fallsBack(unit, dt)) {
        targeting.target = null

        continue
      }

      const attacker = throne ? null : this.answerable(unit)

      if (throne) {
        targeting.target = throne
      } else if (attacker && this.shouldAnswer(unit, attacker)) {
        targeting.target = attacker
      } else if (!this.isValid(unit, targeting.target)) {
        targeting.target = this.find(unit)
      }

      if (targeting.target) {
        targeting.chasing = true
      }
    }
  }

  /**
   * Under Together a hero caught alone by stronger enemy heroes backs off, and keeps backing off for a moment
   * after, so its lane-mates can catch up. Without that order heroes fight it out: backing off gives up the lane.
   */
  private fallsBack(unit: Unit, dt: number) {
    if (unit.kind !== 'hero' || unit.roamer || unit.laneFollower?.stance !== 'group') {
      return false
    }

    const { retreatSeconds } = BATTLE.skirmish
    if (isCaughtAlone(this.ctx.queries.heroes, unit)) {
      if (unit.retreat) {
        unit.retreat.remaining = retreatSeconds
      } else {
        this.ctx.world.addComponent(unit, 'retreat', { remaining: retreatSeconds })
      }

      return true
    }

    if (!unit.retreat || unit.retreat.remaining <= 0) {
      return false
    }

    unit.retreat.remaining -= dt

    return true
  }

  /** Heroes hit by an enemy hero, directly or through its summons, remember who did it. */
  private remember(target: Unit, source: Unit) {
    const attacker = creditedHero(source)
    if (target.kind !== 'hero' || !attacker || attacker.team === target.team) {
      return
    }

    const remaining = BATTLE.hero.retaliationMemory
    if (target.threat) {
      target.threat.attacker = attacker
      target.threat.remaining = remaining
    } else {
      this.ctx.world.addComponent(target, 'threat', {
        attacker,
        remaining,
      })
    }
  }

  /** The hero that hit this one moments ago, if it can be answered without diving under a tower. */
  private answerable(unit: Unit) {
    const threat = unit.threat
    if (unit.kind !== 'hero' || !threat || threat.remaining <= 0 || !isAlive(threat.attacker)) {
      return null
    }

    const attacker = threat.attacker
    const gap = distance(unit.position, attacker.position) - attacker.radius
    if (gap > (unit.targeting?.aggroRange ?? 0) * BATTLE.targetLeash) {
      return null
    }

    /* Backing off a tower beats a trade, unless roots hold the hero there: then it hits back what it can reach. */
    if (this.exposed(unit)) {
      return unit.status.root > 0 && inReach(unit, attacker) ? attacker : null
    }

    /*
     * An attacker the hero cannot reach without walking under a tower is left alone, or the hero would pick it
     * every tick, refuse to walk there and stand idle while creeps beat it.
     */
    return this.canEngage(unit, attacker) ? attacker : null
  }

  /** Farming creeps or hitting buildings never beats answering a hero; a hero fight within reach does. */
  private shouldAnswer(unit: Unit, attacker: Unit) {
    const current = unit.targeting?.target
    if (!current || current === attacker || current.kind !== 'hero' || !isAlive(current)) {
      return true
    }

    const gap = distance(unit.position, current.position) - unit.radius - current.radius
    return gap > attackReach(unit) + REACH_SLACK
  }

  private isValid(unit: Unit, target: Unit | null) {
    if (!target || !isAlive(target) || !unit.targeting || !trainingTargetAllowed(unit, target)) {
      return false
    }

    if (!this.ctx.safety.isStructureVulnerable(target) || this.ctx.safety.isBeyondTower(unit, target)) {
      return false
    }

    const gap = distance(unit.position, target.position) - target.radius
    if (unit.kind === 'structure') {
      return gap <= (unit.attack?.range ?? 0)
    }

    if (gap > this.reach(unit, target) * BATTLE.targetLeash) {
      return false
    }

    if (!withinLaneBand(this.ctx.map, unit, target.position)) {
      return false
    }

    if (unit.kind !== 'hero') {
      return true
    }

    if (unit.roamer?.quarry && target.kind !== 'hero') {
      return false
    }

    if (this.pastHoldLine(unit, target, gap) || this.aheadOfCores(unit, target)) {
      return false
    }

    if (target.kind === 'structure') {
      return this.mayHitStructure(unit, target)
    }

    return this.canEngage(unit, target)
  }

  private throneToFinish(unit: Unit) {
    if (unit.kind !== 'hero' || unit.targeting?.ignoresStructures) {
      return null
    }

    const aggro = unit.targeting?.aggroRange ?? 0
    for (const structure of this.ctx.queries.structures) {
      if (
        structure.team !== unit.team &&
        this.ctx.safety.isStructureVulnerable(structure) &&
        isThroneNearlyDown(structure) &&
        distance(unit.position, structure.position) - structure.radius <= aggro
      ) {
        return structure
      }
    }

    return null
  }

  private mayHitStructure(hero: Unit, structure: Unit) {
    if (hero.targeting?.ignoresStructures || !this.ctx.safety.isStructureVulnerable(structure)) {
      return false
    }

    if (isThroneNearlyDown(structure)) {
      return true
    }

    return !this.woundedUnderTower(hero) && this.ctx.safety.canHitStructure(hero, structure)
  }

  /** Under Hold a hero only takes on what is behind its line, or already within its reach from there. */
  private pastHoldLine(hero: Unit, target: Unit, gap: number) {
    return gap > (hero.attack?.range ?? 0) && beyondHoldLine(this.ctx.map, hero, target.position)
  }

  /** A support fights what its cores fight, within its own reach of them, and never runs ahead of them. */
  private aheadOfCores(hero: Unit, target: Unit) {
    return beyondCores(this.ctx.map, this.ctx.queries.heroes, hero, target.position, attackReach(hero))
  }

  /** A hero standing in range of an untanked enemy tower backs off instead of picking fights. */
  private exposed(unit: Unit) {
    return unit.kind === 'hero' && this.ctx.safety.isUnsafeFor(unit, unit.position)
  }

  /**
   * A hero takes on whatever it can hit from outside enemy tower fire, including targets standing under a
   * tower: what matters is the spot it attacks from, not where the target is.
   */
  private canEngage(hero: Unit, target: Unit) {
    return !this.exposed(hero) && !this.ctx.safety.isUnsafeFor(hero, attackSpot(hero, target))
  }

  private woundedUnderTower(unit: Unit) {
    return (
      unit.kind === 'hero' &&
      unit.health !== undefined &&
      unit.health.current / unit.health.max < BATTLE.hero.towerRetreatHealth &&
      this.ctx.safety.isUnsafeFor(unit, unit.position)
    )
  }

  private reach(unit: Unit, target: Unit) {
    const aggro = unit.targeting?.aggroRange ?? 0

    return unit.kind === 'creep' && target.kind === 'hero' ? Math.max(aggro, BATTLE.creepHeroAggro) : aggro
  }

  private find(unit: Unit) {
    const aggro = unit.targeting?.aggroRange ?? 0
    const reach = unit.kind === 'creep' ? Math.max(aggro, BATTLE.creepHeroAggro) : aggro

    const candidates = this.ctx.index.near(
      unit.position,
      reach,
      (u) =>
        u.team !== unit.team &&
        isAlive(u) &&
        trainingTargetAllowed(unit, u) &&
        /* Buildings leave training dummies to the heroes. */
        !(unit.kind === 'structure' && u.dummy) &&
        (u.kind === 'hero' || distance(unit.position, u.position) <= aggro),
    )

    let best: Unit | null = null
    let bestScore = Infinity
    for (const candidate of candidates) {
      if (
        !withinLaneBand(this.ctx.map, unit, candidate.position) ||
        !this.ctx.safety.isStructureVulnerable(candidate) ||
        this.ctx.safety.isBeyondTower(unit, candidate)
      ) {
        continue
      }

      const score = this.score(unit, candidate)
      if (score < bestScore) {
        bestScore = score
        best = candidate
      }
    }

    return best
  }

  /** At a tower, clear the defending wave first; then attack the tower instead of chasing behind it. */
  private creepSiegeTarget(unit: Unit) {
    const tower = this.ctx.safety.blockingTower(unit)
    const aggro = unit.targeting?.aggroRange ?? 0
    if (!tower || distance(unit.position, tower.position) - tower.radius > aggro) {
      return null
    }

    const defenders = this.ctx.index.near(
      unit.position,
      aggro,
      (candidate) =>
        candidate.team !== unit.team &&
        candidate.kind === 'creep' &&
        isAlive(candidate) &&
        withinLaneBand(this.ctx.map, unit, candidate.position) &&
        !this.ctx.safety.isBeyondTower(unit, candidate),
    )

    return (
      defenders.reduce<Unit | null>(
        (closest, candidate) =>
          !closest || distance(unit.position, candidate.position) < distance(unit.position, closest.position)
            ? candidate
            : closest,
        null,
      ) ?? tower
    )
  }

  private score(unit: Unit, candidate: Unit) {
    const gap = distance(unit.position, candidate.position) - candidate.radius
    switch (unit.kind) {
      case 'structure':
        return gap + (candidate.kind === 'hero' ? PRIORITY.structureIgnoresHeroes : 0)
      case 'hero':
        return this.heroScore(unit, candidate, gap)
      default:
        if (candidate.kind === 'hero') {
          return gap + PRIORITY.creepAvoidsHeroes
        }

        if (candidate.kind === 'structure') {
          return (
            gap +
            (unit.targeting?.prefersStructures
              ? PRIORITY.siegePrefersStructures
              : PRIORITY.creepAvoidsStructures)
          )
        }

        return gap
    }
  }

  private heroScore(hero: Unit, candidate: Unit, gap: number) {
    const quarry = hero.roamer?.quarry
    if (
      (quarry && candidate.kind !== 'hero') ||
      this.pastHoldLine(hero, candidate, gap) ||
      this.aheadOfCores(hero, candidate)
    ) {
      return Infinity
    }

    if (candidate.kind === 'structure') {
      if (!this.mayHitStructure(hero, candidate)) {
        return Infinity
      }

      if (isThroneNearlyDown(candidate)) {
        return gap + PRIORITY.finishThrone
      }

      /* A lane told to push goes for the buildings whenever the creeps let it. */
      const pushing = hero.laneFollower?.stance === 'push'

      return gap + (pushing ? PRIORITY.pushPrefersStructures : PRIORITY.heroStructurePenalty)
    }

    if (!this.canEngage(hero, candidate)) {
      return Infinity
    }

    return (
      gap +
      (candidate.kind === 'hero' ? PRIORITY.heroPrefersHeroes : 0) +
      (candidate === quarry ? PRIORITY.roamerQuarry : 0)
    )
  }
}
