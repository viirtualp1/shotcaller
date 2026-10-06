import { defineStore } from 'pinia'
import { markRaw, ref, shallowRef } from 'vue'
import type { LaneId } from '@/content/ids'
import type { BoardRenderer, CameraState } from '@/rendering/BoardRenderer'

/** Lets HUD widgets (drag and drop, tutorial, camera buttons) talk to the board without prop drilling. */
export const useBoardStore = defineStore('board', () => {
  const renderer = shallowRef<BoardRenderer | null>(null)
  /** Zoomed in by hand or following a lane, on a touch screen. */
  const zoomed = ref(false)
  /** The lane the camera follows through battles; it stays picked between the rounds of a match. */
  const follow = ref<LaneId | null>(null)

  /** A new board starts on the whole map: another match may not even have the lane. */
  function register(board: BoardRenderer | null) {
    renderer.value = board ? markRaw(board) : null
    zoomed.value = false
    follow.value = null
  }

  /** The board reports the camera when a gesture or a reset changes it. */
  function sync(state: CameraState) {
    zoomed.value = state.zoomed
    follow.value = state.follow
  }

  function followLane(lane: LaneId | null) {
    follow.value = lane
    renderer.value?.setFollow(lane)
  }

  function resetView() {
    follow.value = null
    renderer.value?.resetView()
  }

  return {
    renderer,
    zoomed,
    follow,
    register,
    sync,
    followLane,
    resetView,
  }
})
