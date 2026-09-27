import { BATTLE } from '@/content/rules'
import { alliedHeroesAround } from '../abilities/selectors'
import type { SimulationContext, System } from '../SimulationContext'

export class HealAuraSystem implements System {
  constructor(private readonly ctx: SimulationContext) {}

  update(dt: number): void {
    for (const source of this.ctx.queries.auras) {
      const aura = source.healAura
      aura.timer -= dt
      if (aura.timer > 0) continue
      aura.timer += BATTLE.auraInterval
      for (const ally of alliedHeroesAround(this.ctx, source, aura.radius)) {
        this.ctx.combat.heal(ally, ally.health.max * aura.hpPercentPerSecond * BATTLE.auraInterval)
      }
    }
  }
}
