import { TOWER_SLOTS, type ModeId, type StructureSlot } from '@/content/ids'
import { DEFAULT_MODE, MODES } from '@/content/modes'
import { STRUCTURES } from '@/content/units'
import type { StructureState } from '../battle/contracts'

export const STRUCTURE_SLOTS: readonly StructureSlot[] = [...TOWER_SLOTS, 'throne']

/** Every structure a side starts with in the mode; towers the mode has no room for start fallen. */
export const freshStructures = (mode: ModeId = DEFAULT_MODE): StructureState => ({
  ...emptyStructureState(),
  ...Object.fromEntries(MODES[mode].towers.map((slot) => [slot, STRUCTURES.tower.hp])),
  throne: STRUCTURES.throne.hp,
})

export const emptyStructureState = (): StructureState => ({
  top: 0,
  mid: 0,
  bot: 0,
  inner: 0,
  throne: 0,
})

/** The structures of a mode, the throne last. */
export const structureSlotsOf = (mode: ModeId): readonly StructureSlot[] => [...MODES[mode].towers, 'throne']

export const totalStructureHp = (state: StructureState) =>
  STRUCTURE_SLOTS.reduce((sum, slot) => sum + state[slot], 0)
