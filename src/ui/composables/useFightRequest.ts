import { LANE_IDS } from '@/content/ids'
import { useMatchStore } from '../stores/match'
import { useMenuStore } from '../stores/menu'

/** Starts the round, asking first when some lane would be left without a hero. */
export function useFightRequest() {
  const match = useMatchStore()
  const menu = useMenuStore()

  return () => {
    const human = match.view?.human

    if (!human || !match.isPlanning) {
      return
    }

    const emptyLane = human.boardCount > 0 && LANE_IDS.some((lane) => human.lanes[lane].heroes.length === 0)

    if (emptyLane) {
      menu.confirmFight = true

      return
    }

    match.startBattle()
  }
}
