import type { AbilityId } from '@/content/ids'
import type { HeroUnit } from '../ecs/components'
import type { SimulationContext } from '../SimulationContext'

export interface Ability {
  readonly id: AbilityId
  /** Returns false when there is nothing worth casting on, so the mana stays banked. */
  cast(caster: HeroUnit, ctx: SimulationContext): boolean | { readonly manaRefund: number }
}
