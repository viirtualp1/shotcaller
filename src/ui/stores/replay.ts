import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { MatchRecord } from '@/domain/profile/Profile'

/** A recorded fight on the board. Closed by leaving the screen; nothing here is saved. */
export const useReplayStore = defineStore('replay', () => {
  const match = shallowRef<MatchRecord | null>(null)
  const round = ref(1)

  function open(record: MatchRecord) {
    match.value = record
    round.value = 1
  }

  function close() {
    match.value = null
  }

  function selectRound(next: number) {
    if (match.value?.replays[next - 1]) {
      round.value = next
    }
  }

  return {
    match,
    round,
    open,
    close,
    selectRound,
  }
})
