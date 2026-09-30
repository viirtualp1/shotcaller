import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useMatchStore } from './match'
import { usePauseStore } from './pause'

/** The same round report can be revisited from the planning HUD without advancing the match. */
export const useRoundReportStore = defineStore('roundReport', () => {
  const match = useMatchStore()
  const pause = usePauseStore()
  const requested = ref(false)
  const reviewing = computed(() => match.isPlanning)

  const open = computed({
    get: () =>
      match.view?.summary !== null &&
      match.view?.summary !== undefined &&
      (match.phase === 'summary' || (match.isPlanning && requested.value)),
    set: (value) => {
      if (!value) {
        requested.value = false

        if (match.phase === 'summary') {
          match.nextRound()
        }
      }
    },
  })

  watch(
    () => match.phase,
    () => {
      if (!match.isPlanning) {
        requested.value = false
      }
    },
  )

  // Solo players can read the report at their own pace; the duel clock keeps its existing rules.
  watch(open, (shown) => pause.set('roundReport', shown), { immediate: true })

  function show() {
    if (match.isPlanning && match.view?.summary) {
      requested.value = true
    }
  }

  return {
    open,
    reviewing,
    show,
  }
})
