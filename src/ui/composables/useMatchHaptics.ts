import { watch } from 'vue'
import { useMatchStore } from '../stores/match'
import { useHaptics } from './useHaptics'

/** The match's big moments on a phone: a hero gaining a star, and each round won or lost. */
export function useMatchHaptics() {
  const store = useMatchStore()
  const { buzz } = useHaptics()

  watch(
    () => store.notice,
    (notice) => {
      if (notice?.kind === 'promoted') {
        buzz('promoted')
      }
    },
  )

  /* One more round in the history is a round just played; a saved match opening with several is not. */
  watch(
    () => store.view?.history.length ?? 0,
    (count, previous) => {
      const verdict = store.view?.history.at(-1)
      if (count !== previous + 1 || !verdict || verdict === 'draw') {
        return
      }

      buzz(verdict === 'win' ? 'roundWon' : 'roundLost')
    },
  )
}
