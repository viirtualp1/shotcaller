import type { StructureSlot } from '@/content/ids'
import { STRUCTURES } from '@/content/units'
import type { StructureState } from '../battle/contracts'

export const STRUCTURE_SLOTS: readonly StructureSlot[] = ['top', 'mid', 'bot', 'throne']

export const freshStructures = (): StructureState => ({
  top: STRUCTURES.tower.hp,
  mid: STRUCTURES.tower.hp,
  bot: STRUCTURES.tower.hp,
  throne: STRUCTURES.throne.hp,
})

export const emptyStructureState = (): StructureState => ({ top: 0, mid: 0, bot: 0, throne: 0 })

export const totalStructureHp = (state: StructureState): number =>
  STRUCTURE_SLOTS.reduce((sum, slot) => sum + state[slot], 0)
