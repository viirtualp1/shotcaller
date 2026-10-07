import { defineStore } from 'pinia'
import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { fetchReleaseVersion } from '@/application/releaseVersion'
import { usePwaUpdate } from '../composables/usePwaUpdate'
import { isNewerVersion } from '../patchNotes/notes'
import { useMatchStore } from './match'
import { version as currentVersion } from '../../../package.json'

const CHECK_TIMEOUT_MS = 10_000

export const useGameUpdateStore = defineStore('gameUpdate', () => {
  let pendingCheck: Promise<void> | undefined
  let request: AbortController | undefined

  const match = useMatchStore()

  const registration = shallowRef<ServiceWorkerRegistration>()
  const latestVersion = ref<string | null>(null)
  const needRefresh = ref(false)
  const checking = ref(false)
  const requesting = ref(false)
  const notReady = ref(false)

  const outdated = computed(
    () => latestVersion.value !== null && isNewerVersion(latestVersion.value, currentVersion),
  )

  const { updating, failed, applyUpdate, reloadIfUpdating } = usePwaUpdate({
    registration: () => registration.value,
    workers: globalThis.navigator?.serviceWorker,
    reload: () => {
      needRefresh.value = false
      window.location.reload()
    },
  })

  function checkLatest() {
    if (pendingCheck) {
      return pendingCheck
    }

    checking.value = true
    request = new AbortController()
    const signal = request.signal
    const timeout = setTimeout(() => request?.abort(), CHECK_TIMEOUT_MS)

    pendingCheck = fetchReleaseVersion(signal)
      .then((version) => {
        if (version !== null && !signal.aborted) {
          latestVersion.value = version
        }
      })
      .finally(() => {
        clearTimeout(timeout)
        checking.value = false
        pendingCheck = undefined
      })

    return pendingCheck
  }

  async function updateGame() {
    if (match.isDuel || updating.value || requesting.value) {
      return
    }

    failed.value = false
    notReady.value = false
    requesting.value = true
    await checkLatest()

    try {
      const registered = registration.value
      if (registered && !registered.waiting) {
        await registered.update()
      }

      // An old worker still controls this page: wait for the new files instead of reloading its cache.
      if (
        registered &&
        navigator.serviceWorker?.controller &&
        !registered.waiting &&
        !registered.installing &&
        !needRefresh.value
      ) {
        notReady.value = true

        return
      }

      if (!match.isDuel) {
        await applyUpdate()
      }
    } catch {
      failed.value = true
    } finally {
      requesting.value = false
    }
  }

  onScopeDispose(() => request?.abort())

  return {
    currentVersion,
    latestVersion,
    outdated,
    registration,
    needRefresh,
    checking,
    requesting,
    notReady,
    updating,
    failed,
    checkLatest,
    updateGame,
    reloadIfUpdating,
  }
})
