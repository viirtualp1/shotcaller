import { MODES } from '@/content/modes'
import { useMatchStore } from '../stores/match'
import { useMenuStore } from '../stores/menu'

/** Starts the round, asking first when some lane would be left without a hero. */
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
    const emptyLane = human.boardCount > 0 && lanes.some((lane) => human.lanes[lane].heroes.length === 0)

    if (emptyLane) {
      menu.confirmFight = true

      return
    }

    match.startBattle()
  }
}
