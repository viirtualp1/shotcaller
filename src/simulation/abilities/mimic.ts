import { ROLE_SIGNATURES } from '@/content/heroes'
import type { AbilityId } from '@/content/ids'
import type { Ability } from './Ability'
import { barrel } from './barrel'
import { chainLightning } from './chainLightning'
import { charge } from './charge'
import { poisonDagger } from './poisonDagger'
import { prayer } from './prayer'
import { paramsOf } from './params'
import { volley } from './volley'

const SIGNATURES: Readonly<Partial<Record<AbilityId, Ability>>> = {
  volley,
  prayer,
  chainLightning,
  charge,
  barrel,
  poisonDagger,
}

/** Casts the signature ability of the role the hero took on its lane. */
export const mimic: Ability = {
  id: 'mimic',
  cast(caster, ctx) {
    const P = paramsOf(caster, 'mimic')
    const spell = caster.caster
    const { power, healPower } = spell
    spell.power *= P.power
    spell.healPower *= P.power

    const cast = SIGNATURES[ROLE_SIGNATURES[caster.hero.role]]?.cast(caster, ctx) ?? false

    spell.power = power
    spell.healPower = healPower

    return cast
  },
}
