import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useMatchStore } from './match'
import { usePauseStore } from './pause'
import { useSettingsStore } from './settings'

/** Planning countdown on standard difficulty. Real time, so it lives in the UI layer rather than the domain. */
export const usePlanningTimerStore = defineStore('planningTimer', () => {
  const match = useMatchStore()
  const settings = useSettingsStore()
  const pause = usePauseStore()
  const remaining = ref<number | null>(null)

  const total = computed(() => settings.planningSeconds)
  const paused = computed(() => pause.paused)

  watch(
    [() => match.phase, () => match.view?.round, total],
    () => (remaining.value = match.isPlanning ? total.value : null),
    { immediate: true },
  )

  function tick(realSeconds: number) {
    if (remaining.value === null || !match.isPlanning || pause.paused) {
      return
    }

    remaining.value = Math.max(0, remaining.value - realSeconds)

    if (remaining.value > 0) {
      return
    }

    remaining.value = null
    match.startBattleOnTimeout()
  }

  return {
    remaining,
    total,
    paused,
    tick,
  }
})
