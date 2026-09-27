import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePauseStore } from './pause'

/** Which full-screen menus and dialogs are open; each one pauses the game while visible. */
export const useMenuStore = defineStore('menu', () => {
  const pause = usePauseStore()
  const gameMenu = ref(false)
  const settings = ref(false)
  const help = ref(false)
  const newMatch = ref(false)
  /** Set when a tutorial should start as soon as the game screen is ready. */
  const tutorialPending = ref(false)

  watch(gameMenu, (open) => pause.set('menu', open))
  watch(settings, (open) => pause.set('settings', open))
  watch(help, (open) => pause.set('help', open))
  watch(newMatch, (open) => pause.set('newMatch', open))

  function requestTutorial() {
    tutorialPending.value = true
  }

  return {
    gameMenu,
    settings,
    help,
    newMatch,
    tutorialPending,
    requestTutorial,
  }
})
