import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import { MODE_IDS, type ModeId } from '@/content/ids'
import type { LeaderboardEntry } from '@/application/social/leaderboard'
import { usePage } from '../composables/usePage'
import { leaderboardPath } from '../seo'
import { useCloudStore } from './cloud'
import { useSettingsStore } from './settings'

export const useLeaderboardStore = defineStore('leaderboard', () => {
  let generation = 0

  const cloud = useCloudStore()
  const settings = useSettingsStore()

  const page = usePage<ModeId>(
    (path) => {
      const match = /^\/leaderboard(?:\/(\w+))?\/?$/.exec(path)
      if (!match) {
        return null
      }

      return MODE_IDS.find((mode) => mode === match[1]) ?? settings.mode
    },
    (mode) => leaderboardPath(mode),
  )

  const rows = shallowRef<LeaderboardEntry[]>([])
  const loading = ref(false)
  const error = ref(false)

  const isOpen = computed(() => page.state.value !== null)
  const mode = computed(() => page.state.value ?? settings.mode)

  async function refresh() {
    const attempt = ++generation
    rows.value = []
    error.value = false
    loading.value = false

    if (!isOpen.value || !cloud.enabled) {
      return
    }

    const selected = mode.value
    loading.value = true

    try {
      const connection = await cloud.connect()
      if (attempt !== generation) {
        return
      }

      const result = await connection.leaderboard().read(selected)
      if (attempt === generation) {
        rows.value = result
      }
    } catch {
      if (attempt === generation) {
        error.value = true
      }
    } finally {
      if (attempt === generation) {
        loading.value = false
      }
    }
  }

  watch(
    [() => page.state.value, () => cloud.enabled, () => cloud.account?.id, () => cloud.signedIn],
    () => void refresh(),
    { immediate: true },
  )

  return {
    rows,
    loading,
    error,
    isOpen,
    mode,
    open: (selected: ModeId = settings.mode) => page.open(selected),
    select: page.replace,
    close: page.close,
    refresh,
  }
})
