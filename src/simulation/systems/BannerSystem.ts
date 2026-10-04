import { ABILITY_PARAMS } from '@/content/abilities'
import type { LaneStance } from '@/content/ids'
import { isAlive, type Rally, type Unit } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

const P = ABILITY_PARAMS.standard

const NO_RALLY: Rally = {
  damage: 1,
  attackSpeed: 1,
  structureDamage: 1,
  damageTaken: 1,
}

interface BannerEffect {
  readonly affects: (unit: Unit) => boolean
  readonly rally: Partial<Rally>
}

const isSummonOrCreep = (u: Unit) => u.kind === 'creep' || (u.kind === 'turret' && !u.banner)

/** What a Battle Standard does for the units around it under each order; null is a lane without one. */
const EFFECTS: Readonly<Record<LaneStance | 'none', BannerEffect>> = {
  push: {
    affects: isSummonOrCreep,
    rally: {
      attackSpeed: P.pushAttackSpeed,
      structureDamage: P.pushStructureDamage,
    },
  },
  hold: {
    affects: (u) => u.kind === 'structure',
    rally: { damageTaken: P.holdProtection },
  },
  group: {
    affects: (u) => u.kind === 'hero' && !u.dummy,
    rally: { damage: P.groupDamage },
  },
  none: {
    affects: (u) => u.kind === 'hero' && !u.dummy,
    rally: { damageTaken: P.guard },
  },
}

/** Banners do not stack: a unit by two of them gets the better of each effect. */
function merge(current: Rally, extra: Partial<Rally>): Rally {
  return {
    damage: Math.max(current.damage, extra.damage ?? 1),
    attackSpeed: Math.max(current.attackSpeed, extra.attackSpeed ?? 1),
    structureDamage: Math.max(current.structureDamage, extra.structureDamage ?? 1),
    damageTaken: Math.min(current.damageTaken, extra.damageTaken ?? 1),
  }
}

/** Sets the rally of every unit standing by a Battle Standard again each step, so leaving one ends it. */
export class BannerSystem implements System {
  private rallied: Unit[] = []

  constructor(private readonly ctx: SimulationContext) {}

  update() {
    for (const unit of this.rallied) {
      delete unit.rally
    }

    this.rallied = []

    for (const banner of this.ctx.queries.banners) {
      const effect = EFFECTS[banner.banner.stance ?? 'none']

      const allies = this.ctx.index.near(
        banner.position,
        banner.banner.radius,
        (u) => u.team === banner.team && u !== banner && isAlive(u) && effect.affects(u),
      )

      for (const ally of allies) {
        if (!ally.rally) {
          this.rallied.push(ally)
        }

        ally.rally = merge(ally.rally ?? NO_RALLY, effect.rally)
      }
    }
  }
}
