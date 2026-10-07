type UpdateWorker = Pick<ServiceWorker, 'state' | 'postMessage' | 'addEventListener' | 'removeEventListener'>

interface UpdateRegistration {
  readonly waiting: UpdateWorker | null
  readonly active: UpdateWorker | null
  readonly installing?: UpdateWorker | null
}

type WorkerEvents = Pick<ServiceWorkerContainer, 'addEventListener' | 'removeEventListener'>

export const UPDATE_TIMEOUT_MS = 30_000
const UPDATE_POLL_MS = 250

function waitForInstallation(installing: UpdateWorker, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let settled = false

    function finish(error?: Error) {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timeout)
      clearInterval(poll)
      installing.removeEventListener('statechange', check)
      signal?.removeEventListener('abort', abort)

      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }

    function check() {
      if (installing.state === 'installed' || installing.state === 'activated') {
        finish()
      } else if (installing.state === 'redundant') {
        finish(new Error('Update installation failed'))
      }
    }

    function abort() {
      finish(new DOMException('Update canceled', 'AbortError'))
    }

    const poll = setInterval(check, UPDATE_POLL_MS)

    const timeout = setTimeout(() => {
      check()
      finish(new Error('Update installation timed out'))
    }, UPDATE_TIMEOUT_MS)

    installing.addEventListener('statechange', check)
    signal?.addEventListener('abort', abort, { once: true })

    if (signal?.aborted) {
      abort()
    } else {
      check()
    }
  })
}

/** Request activation of the actual waiting worker, including updates found by another tab. */
export async function activateWaitingWorker(
  registration: UpdateRegistration,
  workers: WorkerEvents,
  signal?: AbortSignal,
) {
  const installing = registration.installing
  if (installing) {
    await waitForInstallation(installing, signal)
  }

  const worker = registration.waiting
  if (!worker) {
    return
  }

  const previousActive = registration.active

  await new Promise<void>((resolve, reject) => {
    const waiting = worker
    let settled = false

    function finish(error?: Error) {
      if (settled) {
        return
      }

      settled = true
      clearInterval(poll)
      clearTimeout(timeout)
      waiting.removeEventListener('statechange', check)
      workers.removeEventListener('controllerchange', check)
      signal?.removeEventListener('abort', abort)

      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }

    function check() {
      if (
        waiting.state === 'activated' ||
        (registration.active !== previousActive && registration.active?.state === 'activated')
      ) {
        finish()
      } else if (waiting.state === 'redundant') {
        finish(new Error('The update worker was discarded'))
      }
    }

    function abort() {
      finish(new DOMException('Update canceled', 'AbortError'))
    }

    // Events can arrive late after a tab resumes, so inspect the state periodically too.
    const poll = setInterval(check, UPDATE_POLL_MS)

    const timeout = setTimeout(() => {
      check()
      finish(new Error('Update activation timed out'))
    }, UPDATE_TIMEOUT_MS)

    waiting.addEventListener('statechange', check)
    workers.addEventListener('controllerchange', check)
    signal?.addEventListener('abort', abort, { once: true })

    if (signal?.aborted) {
      abort()

      return
    }

    check()

    if (!settled) {
      try {
        waiting.postMessage({ type: 'SKIP_WAITING' })
        check()
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Cannot activate the update', { cause: error }))
      }
    }
  })
}
