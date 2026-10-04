import type { AbilityId } from '@/content/ids'
import type { Ability } from './Ability'
import { assassinate } from './assassinate'
import { backstab } from './backstab'
import { barrel } from './barrel'
import { blizzard } from './blizzard'
import { chainLightning } from './chainLightning'
import { charge } from './charge'
import { fireball } from './fireball'
import { hook } from './hook'
import { leap } from './leap'
import { mend } from './mend'
import { mimic } from './mimic'
import { poisonDagger } from './poisonDagger'
import { prayer } from './prayer'
import { quake } from './quake'
import { raiseDead } from './raiseDead'
import { roots } from './roots'
import { shield } from './shield'
import { standard } from './standard'
import { turret } from './turret'
import { volley } from './volley'
import { whirl } from './whirl'

export type AbilityRegistry = Readonly<Record<AbilityId, Ability>>

export const ABILITIES: AbilityRegistry = {
  charge,
  volley,
  prayer,
  barrel,
  chainLightning,
  poisonDagger,
  backstab,
  fireball,
  roots,
  whirl,
  leap,
  raiseDead,
  blizzard,
  quake,
  turret,
  hook,
  assassinate,
  shield,
  standard,
  mend,
  mimic,
}
