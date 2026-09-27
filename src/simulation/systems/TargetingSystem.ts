import { BATTLE } from '@/content/rules'
import { distance } from '@/core/math/vec2'
import { isAlive, isDisabled, type Unit } from '../ecs/components'
import { creditedHero } from '../services/CombatService'
import { withinLaneBand } from '../services/laneBand'
import type { SimulationContext, System } from '../SimulationContext'

const PRIORITY = {
  structureIgnoresHeroes: 1000,
  creepAvoidsHeroes: 60,
  creepAvoidsStructures: 120,
  siegePrefersStructures: -150,
  heroPrefersHeroes: -50,
  heroStructurePenalty: 80,
  roamerQuarry: -300,
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
      const attacker = this.answerable(unit)

      if (attacker && this.shouldAnswer(unit, attacker)) {
        targeting.target = attacker
      } else if (!this.isValid(unit, targeting.target)) {
        targeting.target = this.find(unit)
      }

      if (targeting.target) {
        targeting.chasing = true
      }
    }
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

    const inReach = gap <= (unit.attack?.range ?? 0)
    if (!inReach && this.ctx.safety.isProtected(attacker, unit.team)) {
      return null
    }

    return attacker
  }

  /** Farming creeps or hitting buildings never beats answering a hero; a hero fight within reach does. */
  private shouldAnswer(unit: Unit, attacker: Unit) {
    const current = unit.targeting?.target
    if (!current || current === attacker || current.kind !== 'hero' || !isAlive(current)) {
      return true
    }

    const gap = distance(unit.position, current.position) - current.radius
    return gap > (unit.attack?.range ?? 0) + REACH_SLACK
  }

  private isValid(unit: Unit, target: Unit | null) {
    if (!target || !isAlive(target) || !unit.targeting) {
      return false
    }

    const gap = distance(unit.position, target.position) - target.radius
    if (unit.kind === 'structure') {
      return gap <= (unit.attack?.range ?? 0)
    }

    if (gap > unit.targeting.aggroRange * BATTLE.targetLeash) {
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

    if (target.kind === 'structure') {
      return this.ctx.safety.canHitStructure(unit, target)
    }

    return !this.ctx.safety.isProtected(target, unit.team)
  }

  private find(unit: Unit) {
    const aggro = unit.targeting?.aggroRange ?? 0

    const candidates = this.ctx.index.near(unit.position, aggro, (u) => u.team !== unit.team && isAlive(u))

    let best: Unit | null = null
    let bestScore = Infinity
    for (const candidate of candidates) {
      if (!withinLaneBand(this.ctx.map, unit, candidate.position)) {
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
    if (quarry && candidate.kind !== 'hero') {
      return Infinity
    }

    if (candidate.kind === 'structure') {
      return this.ctx.safety.canHitStructure(hero, candidate) ? gap + PRIORITY.heroStructurePenalty : Infinity
    }

    if (this.ctx.safety.isProtected(candidate, hero.team)) {
      return Infinity
    }

    return (
      gap +
      (candidate.kind === 'hero' ? PRIORITY.heroPrefersHeroes : 0) +
      (candidate === quarry ? PRIORITY.roamerQuarry : 0)
    )
  }
}
