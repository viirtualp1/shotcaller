import { defineStore } from 'pinia'
import { computed, shallowReactive } from 'vue'

/** Modal windows open right now, so floating panels can step aside for them. */
export const useModalsStore = defineStore('modals', () => {
  const open = shallowReactive(new Set<symbol>())

  return {
    open,
    anyOpen: computed(() => open.size > 0),
  }
})
