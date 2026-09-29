import { MODES } from '@/content/modes'
import { useMatchStore } from '../stores/match'
import { useMenuStore } from '../stores/menu'

/** Starts the round, asking first when a lane is empty even though the board could cover every lane. */
export function useFightRequest() {
  const match = useMatchStore()
  const menu = useMenuStore()

  return () => {
    const view = match.view

    if (!view || !match.isPlanning) {
      return
    }

    const { human } = view
    const lanes = MODES[view.mode].lanes
    const hasEmptyLane = lanes.some((lane) => human.lanes[lane].heroes.length === 0)
    const canCoverEveryLane = human.boardCapacity >= lanes.length
    const emptyLane = human.boardCount > 0 && hasEmptyLane && canCoverEveryLane

    if (emptyLane) {
      menu.confirmFight = true

      return
    }

    match.startBattle()
  }
}
