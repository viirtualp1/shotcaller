import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { DUEL_PLANNING_SECONDS } from '@/content/rules'
import { useMatchStore } from './match'
import { usePauseStore } from './pause'
import { useSettingsStore } from './settings'

/**
 * Planning countdown on standard difficulty and in duels. Real time, so it lives in the UI layer rather than
 * the domain. A duel's clock never pauses and runs to a deadline both devices share: the other player keeps planning.
 */
export const usePlanningTimerStore = defineStore('planningTimer', () => {
  const match = useMatchStore()
  const settings = useSettingsStore()
  const pause = usePauseStore()
  const remaining = ref<number | null>(null)
  /** The duel deadline already acted on, so a board that failed to send is not sent again every frame. */
  let spentDeadline: number | null = null

  const total = computed(() => (match.isDuel ? DUEL_PLANNING_SECONDS : settings.planningSeconds))
  const paused = computed(() => pause.paused && !match.isDuel)

  const duelSecondsLeft = () =>
    match.planningEndsAt === null ? null : Math.max(0, (match.planningEndsAt - Date.now()) / 1000)

  watch(
    [() => match.phase, () => match.view?.round, total, () => match.planningEndsAt],
    () => (remaining.value = match.isDuel ? duelSecondsLeft() : match.isPlanning ? total.value : null),
    { immediate: true },
  )

  function tickDuel() {
    const deadline = match.planningEndsAt
    remaining.value = duelSecondsLeft()

    if (remaining.value !== 0 || deadline === spentDeadline) {
      return
    }

    if (match.isPlanning || match.phase === 'summary') {
      spentDeadline = deadline
      match.startBattleOnTimeout()
    }
  }

  function tick(realSeconds: number) {
    if (match.isDuel) {
      return tickDuel()
    }

    if (remaining.value === null || !match.isPlanning || paused.value) {
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
