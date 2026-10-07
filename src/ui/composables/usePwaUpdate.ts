import { onScopeDispose, ref } from 'vue'
import { activateWaitingWorker } from '@/application/pwaUpdate'

interface UpdateEnvironment {
  readonly registration: () => ServiceWorkerRegistration | undefined
  readonly workers: ServiceWorkerContainer | undefined
  readonly reload: () => void
}

export function usePwaUpdate(environment: UpdateEnvironment) {
  const lifetime = new AbortController()
  let reloaded = false

  const updating = ref(false)
  const failed = ref(false)

  function reloadOnce() {
    if (reloaded || lifetime.signal.aborted) {
      return
    }

    reloaded = true
    updating.value = false
    environment.reload()
  }

  function reloadIfUpdating() {
    if (updating.value) {
      reloadOnce()
    }
  }

  async function applyUpdate() {
    if (updating.value || reloaded || lifetime.signal.aborted) {
      return
    }

    updating.value = true
    failed.value = false

    try {
      const registration = environment.registration()
      if (registration && environment.workers) {
        await activateWaitingWorker(registration, environment.workers, lifetime.signal)
      }

      reloadOnce()
    } catch {
      if (!lifetime.signal.aborted && !reloaded) {
        failed.value = true
      }
    } finally {
      updating.value = false
    }
  }

  onScopeDispose(() => lifetime.abort())

  return {
    updating,
    failed,
    applyUpdate,
    reloadIfUpdating,
  }
}
