import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePauseStore } from './pause'

export type MatchOpponent = 'computer' | 'online' | 'training'

/** Which full-screen menus and dialogs are open; each one pauses the game while visible. */
export const useMenuStore = defineStore('menu', () => {
  const pause = usePauseStore()
  const gameMenu = ref(false)
  const settings = ref(false)
  const help = ref(false)
  const newMatch = ref(false)
  /** The tab the new match dialog opens on. */
  const newMatchOpponent = ref<MatchOpponent>('computer')
  const confirmFight = ref(false)
  /** Set when a tutorial should start as soon as the game screen is ready. */
  const tutorialPending = ref(false)

  watch(gameMenu, (open) => pause.set('menu', open))
  watch(settings, (open) => pause.set('settings', open))
  watch(help, (open) => pause.set('help', open))
  watch(newMatch, (open) => pause.set('newMatch', open))
  watch(confirmFight, (open) => pause.set('confirm', open))

  /** Opens the new match dialog on one kind of opponent, as the start screen's quick tiles do. */
  function openNewMatch(opponent: MatchOpponent = 'computer') {
    newMatchOpponent.value = opponent
    newMatch.value = true
  }

  function requestTutorial() {
    tutorialPending.value = true
  }

  return {
    gameMenu,
    settings,
    help,
    newMatch,
    newMatchOpponent,
    openNewMatch,
    confirmFight,
    tutorialPending,
    requestTutorial,
  }
})
