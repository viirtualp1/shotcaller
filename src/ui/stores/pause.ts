import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

export type PauseReason =
  | 'menu'
  | 'tutorial'
  | 'zoomHint'
  | 'help'
  | 'settings'
  | 'newMatch'
  | 'confirm'
  | 'roundReport'
  /** The coach stopped a training battle to look around. */
  | 'training'

/** Anything that covers the board pauses both the battle and the planning countdown. */
export const usePauseStore = defineStore('pause', () => {
  const reasons = reactive(new Set<PauseReason>())
  const paused = computed(() => reasons.size > 0)

  function set(reason: PauseReason, value: boolean) {
    if (value) {
      reasons.add(reason)
    } else {
      reasons.delete(reason)
    }
  }

  return {
    paused,
    set,
  }
})
