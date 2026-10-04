import type { AbilityId } from '@/content/ids'
import { tunedParams } from '@/content/talents'
import type { HeroUnit } from '../ecs/components'

const NONE = [] as const

/** The parameters a hero casts its own ability with, talents included; a borrowed ability keeps its plain ones. */
export const paramsOf = <A extends AbilityId>(caster: HeroUnit, ability: A) =>
  tunedParams(ability, caster.caster.ability === ability ? caster.caster.talents : NONE)
