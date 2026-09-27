import type { AbilityRegistry } from '../abilities/registry'
import { isAlive, isDisabled, isHero } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

export class AbilitySystem implements System {
  constructor(
    private readonly ctx: SimulationContext,
    private readonly abilities: AbilityRegistry,
  ) {}

  update(): void {
    for (const caster of this.ctx.queries.casters) {
      if (!isHero(caster) || !isAlive(caster) || isDisabled(caster)) continue
      if (caster.mana.current < caster.mana.max) continue
      const ability = this.abilities[caster.caster.ability]
      if (!ability.cast(caster, this.ctx)) continue
      caster.mana.current = 0
      this.ctx.events.emit('abilityCast', { caster, ability: ability.id })
    }
  }
}
