import { useTimeoutFn } from '@vueuse/core'
import { readonly, ref, watch } from 'vue'
import type { MatchView } from '@/application/views'
import { TWIST_NOTICE_MS } from '../components/hud/twistNotice'

type AnnouncementView = Pick<MatchView, 'round' | 'phase' | 'twist'>

const ANNOUNCE_MS = 3500

/** Reveal on entering the match or changing rounds/phases, never on a new planning snapshot. */
export function useScoreboardAnnouncement(view: () => AnnouncementView | null) {
  const announcing = ref(false)
  const duration = ref(ANNOUNCE_MS)
  const { start } = useTimeoutFn(() => (announcing.value = false), duration, { immediate: false })

  // Separate primitive sources let Vue ignore snapshots from purchases, placement and lane orders.
  watch(
    [() => view()?.round, () => view()?.phase],
    () => {
      const current = view()
      if (!current) {
        return
      }

      duration.value = current.phase === 'planning' && current.twist ? TWIST_NOTICE_MS : ANNOUNCE_MS
      announcing.value = true
      start()
    },
    { immediate: true },
  )

  return readonly(announcing)
}
