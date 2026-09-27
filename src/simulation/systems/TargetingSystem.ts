import { BATTLE } from '@/content/rules'
import { distance } from '@/core/math/vec2'
import { isAlive, isDisabled, type Unit } from '../ecs/components'
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

export class TargetingSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update() {
    for (const unit of this.ctx.queries.fighters) {
      if (!isAlive(unit) || isDisabled(unit)) {
        continue
      }

      const targeting = unit.targeting
      if (!this.isValid(unit, targeting.target)) {
        targeting.target = this.find(unit)
      }

      if (targeting.target) {
        targeting.chasing = true
      }
    }
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

    const candidates = this.ctx.index.near(
      unit.position,
      aggro,
      (u) => u.team !== unit.team && isAlive(u) && withinLaneBand(this.ctx.map, unit, u.position),
    )

    let best: Unit | null = null
    let bestScore = Infinity
    for (const candidate of candidates) {
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
