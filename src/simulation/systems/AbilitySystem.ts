import type { AbilityRegistry } from '../abilities/registry'
import { isAlive, isDisabled, isHero, type HeroUnit } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

export class AbilitySystem implements System {
  constructor(
    private readonly ctx: SimulationContext,
    private readonly abilities: AbilityRegistry,
  ) {}

  update(dt: number) {
    this.repeatEchoes(dt)

    for (const caster of this.ctx.queries.casters) {
      if (!isHero(caster) || !isAlive(caster)) {
        continue
      }

      const mana = caster.mana
      if (mana.regen > 0) {
        mana.current = Math.min(mana.max, mana.current + mana.regen * mana.gain * dt)
      }

      if (isDisabled(caster) || caster.channel) {
        continue
      }

      if (caster.mana.current < caster.mana.max) {
        continue
      }

      const ability = this.abilities[caster.caster.ability]
      const cast = ability.cast(caster, this.ctx)
      if (!cast) {
        continue
      }

      caster.mana.current =
        typeof cast === 'object' ? Math.min(caster.mana.max, Math.max(0, cast.manaRefund)) : 0

      this.ctx.events.emit('abilityCast', {
        caster,
        ability: ability.id,
      })

      const echo = caster.itemEffects?.echo ?? 0
      if (echo > 0) {
        this.ctx.world.addComponent(caster, 'echo', { remaining: caster.itemEffects!.echoDelay })
      }
    }
  }

  /** An Echo Shard casts the ability again, weaker and with shorter stuns; a stun or death lets it fizzle. */
  private repeatEchoes(dt: number) {
    for (const caster of [...this.ctx.queries.echoes]) {
      caster.echo.remaining -= dt

      if (caster.echo.remaining > 0) {
        continue
      }

      this.ctx.world.removeComponent(caster, 'echo')

      if (isHero(caster) && isAlive(caster) && !isDisabled(caster) && !caster.channel) {
        this.echo(caster)
      }
    }
  }

  private echo(caster: HeroUnit) {
    const scale = caster.itemEffects?.echo ?? 0
    const spell = caster.caster
    const { power, healPower } = spell
    spell.power *= scale
    spell.healPower *= scale
    spell.stunScale = scale

    const ability = this.abilities[spell.ability]
    const cast = ability.cast(caster, this.ctx)

    spell.power = power
    spell.healPower = healPower
    spell.stunScale = 1

    if (cast) {
      this.ctx.events.emit('abilityCast', {
        caster,
        ability: ability.id,
        echo: true,
      })
    }
  }
}
