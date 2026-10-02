import { defineStore } from 'pinia'
import { useIntervalFn } from '@vueuse/core'
import { ref, shallowRef } from 'vue'
import { LIVE_MATCH_INTERVAL, type LiveMatch } from '@/application/social/liveMatch'
import type { MatchRecord } from '@/domain/profile/Profile'
import { BALANCE_FINGERPRINT } from '@/content/balance'

/** A recorded fight on the board. Closed by leaving the screen; nothing here is saved. */
export const useReplayStore = defineStore('replay', () => {
  let generation = 0
  let loading = false
  let fetchLive: (() => Promise<LiveMatch | null>) | null = null
  const match = shallowRef<MatchRecord | null>(null)
  const round = ref(1)
  const live = shallowRef<LiveMatch | null>(null)
  /** When the latest snapshot arrived, so the battle can run on between snapshots instead of waiting for them. */
  const liveReceivedAt = ref(0)
  const liveFriend = ref<string | null>(null)
  const liveStatus = ref<'off' | 'loading' | 'watching' | 'ended' | 'error' | 'incompatible'>('off')

  async function refreshLive() {
    if (!fetchLive || loading) {
      return
    }

    const attempt = generation
    loading = true

    try {
      const snapshot = await fetchLive()
      if (attempt !== generation) {
        return
      }

      if (!snapshot) {
        liveStatus.value = 'ended'
        live.value = null
        fetchLive = null

        return
      }

      if (snapshot.record.balance !== BALANCE_FINGERPRINT) {
        liveStatus.value = 'incompatible'
        live.value = null
        fetchLive = null

        return
      }

      match.value = snapshot.record
      live.value = snapshot
      liveReceivedAt.value = Date.now()
      round.value = Math.max(1, snapshot.record.replays.length)
      liveStatus.value = snapshot.phase === 'finished' ? 'ended' : 'watching'

      if (snapshot.phase === 'finished') {
        fetchLive = null
      }
    } catch {
      if (attempt === generation) {
        liveStatus.value = 'error'
      }
    } finally {
      if (attempt === generation) {
        loading = false
      }
    }
  }

  function openLive(friend: string, load: () => Promise<LiveMatch | null>) {
    close()
    liveFriend.value = friend
    liveStatus.value = 'loading'
    fetchLive = load
    void refreshLive()
  }

  function open(record: MatchRecord) {
    close()
    match.value = record
    round.value = 1
  }

  function close() {
    generation++
    loading = false
    fetchLive = null
    live.value = null
    liveFriend.value = null
    liveStatus.value = 'off'
    match.value = null
  }

  function selectRound(next: number) {
    if (!liveFriend.value && match.value?.replays[next - 1]) {
      round.value = next
    }
  }

  useIntervalFn(() => void refreshLive(), LIVE_MATCH_INTERVAL)

  return {
    match,
    live,
    liveReceivedAt,
    liveFriend,
    liveStatus,
    round,
    open,
    openLive,
    close,
    selectRound,
  }
})
