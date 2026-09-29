import { defineStore } from 'pinia'
import { ref } from 'vue'

export type DockTab = 'shop' | 'heroes' | 'lanes' | 'stats'

/** Which planning panel the phone and tablet layout shows under the map. */
export const useDockStore = defineStore('dock', () => {
  const tab = ref<DockTab>('shop')

  return {
    tab,
  }
})
