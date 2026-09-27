import { defineStore } from 'pinia'
import { markRaw, shallowRef } from 'vue'
import type { BoardRenderer } from '@/rendering/BoardRenderer'

/** Lets HUD widgets (drag and drop, tutorial) talk to the board without prop drilling. */
export const useBoardStore = defineStore('board', () => {
  const renderer = shallowRef<BoardRenderer | null>(null)

  function register(board: BoardRenderer | null) {
    renderer.value = board ? markRaw(board) : null
  }

  return {
    renderer,
    register,
  }
})
