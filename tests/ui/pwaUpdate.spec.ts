import { effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activateWaitingWorker, UPDATE_TIMEOUT_MS } from '@/application/pwaUpdate'
import { usePwaUpdate } from '@/ui/composables/usePwaUpdate'

const scopes: EffectScope[] = []

function worker(state: ServiceWorkerState = 'installed') {
  return Object.assign(new EventTarget(), {
    state,
    postMessage: vi.fn(),
  })
}

function fixture() {
  const waiting = worker()

  const registration = {
    waiting: waiting as ReturnType<typeof worker> | null,
    active: worker('activated'),
  }

  return {
    waiting,
    registration,
    workers: new EventTarget(),
  }
}

function updateState(current: ReturnType<typeof fixture>) {
  const scope = effectScope()
  scopes.push(scope)
  const reload = vi.fn()

  const state = scope.run(() =>
    usePwaUpdate({
      registration: () => current.registration as unknown as ServiceWorkerRegistration,
      workers: current.workers as ServiceWorkerContainer,
      reload,
    }),
  )!

  return {
    state,
    scope,
    reload,
  }
}

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  for (const scope of scopes.splice(0)) {
    scope.stop()
  }

  vi.useRealTimers()
})

describe('service worker activation', () => {
  it('waits for downloading files before activating the new worker', async () => {
    const current = fixture()
    const installing = worker('installing')

    const registration = {
      ...current.registration,
      waiting: null as ReturnType<typeof worker> | null,
      installing,
    }

    const pending = activateWaitingWorker(registration, current.workers)
    expect(installing.postMessage).not.toHaveBeenCalled()

    registration.waiting = installing
    installing.state = 'installed'
    installing.dispatchEvent(new Event('statechange'))
    await Promise.resolve()
    expect(installing.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'SKIP_WAITING' })

    installing.state = 'activated'
    installing.dispatchEvent(new Event('statechange'))
    await pending
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports failed installation instead of reloading the old cache', async () => {
    const current = fixture()
    const installing = worker('installing')

    const pending = activateWaitingWorker(
      {
        ...current.registration,
        installing,
      },
      current.workers,
    )

    const rejection = expect(pending).rejects.toThrow('Update installation failed')
    installing.state = 'redundant'
    installing.dispatchEvent(new Event('statechange'))
    await rejection
    expect(current.waiting.postMessage).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels an installation wait without activating or leaving timers', async () => {
    const current = fixture()
    const installing = worker('installing')
    const lifetime = new AbortController()

    const pending = activateWaitingWorker(
      {
        ...current.registration,
        installing,
      },
      current.workers,
      lifetime.signal,
    )

    const rejection = expect(pending).rejects.toThrow('Update canceled')
    lifetime.abort()
    await rejection
    expect(current.waiting.postMessage).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('requests the actual waiting worker and finishes when it activates', async () => {
    const current = fixture()
    const pending = activateWaitingWorker(current.registration, current.workers)

    expect(current.waiting.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'SKIP_WAITING' })

    current.waiting.state = 'activated'
    current.waiting.dispatchEvent(new Event('statechange'))
    await pending

    expect(vi.getTimerCount()).toBe(0)
  })

  it('recognizes activation that happened before listeners were attached', async () => {
    const current = fixture()
    current.waiting.state = 'activated'
    await activateWaitingWorker(current.registration, current.workers)

    expect(current.waiting.postMessage).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('recognizes activation even when no browser event arrives', async () => {
    const current = fixture()
    const pending = activateWaitingWorker(current.registration, current.workers)
    current.waiting.state = 'activated'
    current.registration.waiting = null
    current.registration.active = current.waiting
    await vi.advanceTimersByTimeAsync(250)
    await pending

    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not wait again if another tab already activated the update', async () => {
    const current = fixture()
    current.registration.waiting = null
    await activateWaitingWorker(current.registration, current.workers)

    expect(current.waiting.postMessage).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not mistake the old controller for the new version', async () => {
    const current = fixture()
    const finished = vi.fn()
    const pending = activateWaitingWorker(current.registration, current.workers).then(finished)
    current.workers.dispatchEvent(new Event('controllerchange'))
    await Promise.resolve()

    expect(finished).not.toHaveBeenCalled()

    current.waiting.state = 'activated'
    current.workers.dispatchEvent(new Event('controllerchange'))
    await pending

    expect(finished).toHaveBeenCalledOnce()
  })

  it('accepts a newer active worker if another update superseded the waiting one', async () => {
    const current = fixture()
    const pending = activateWaitingWorker(current.registration, current.workers)
    current.waiting.state = 'redundant'
    current.registration.active = worker('activated')
    current.workers.dispatchEvent(new Event('controllerchange'))
    await pending

    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects a discarded update and cleans up its listeners and timers', async () => {
    const current = fixture()
    const removeWorkerListener = vi.spyOn(current.waiting, 'removeEventListener')
    const removeControllerListener = vi.spyOn(current.workers, 'removeEventListener')
    const pending = activateWaitingWorker(current.registration, current.workers)
    const rejected = expect(pending).rejects.toThrow('discarded')
    current.waiting.state = 'redundant'
    current.waiting.dispatchEvent(new Event('statechange'))
    await rejected

    expect(removeWorkerListener).toHaveBeenCalledWith('statechange', expect.any(Function))
    expect(removeControllerListener).toHaveBeenCalledWith('controllerchange', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
  })

  it('bounds the wait when the worker never responds', async () => {
    const current = fixture()
    const pending = activateWaitingWorker(current.registration, current.workers)
    const rejected = expect(pending).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(UPDATE_TIMEOUT_MS)
    await rejected

    expect(vi.getTimerCount()).toBe(0)
  })

  it('handles a failure to send the activation message', async () => {
    const current = fixture()
    current.waiting.postMessage.mockImplementation(() => {
      throw new Error('Cannot reach the worker')
    })

    await expect(activateWaitingWorker(current.registration, current.workers)).rejects.toThrow(
      'Cannot reach the worker',
    )

    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels an activation when its owner leaves', async () => {
    const current = fixture()
    const lifetime = new AbortController()
    const pending = activateWaitingWorker(current.registration, current.workers, lifetime.signal)
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    lifetime.abort()
    await rejected

    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('update prompt state', () => {
  it('unlocks the game after timeout and allows the update to be retried', async () => {
    const current = fixture()
    const { state, reload } = updateState(current)
    const pending = state.applyUpdate()

    expect(state.updating.value).toBe(true)
    await vi.advanceTimersByTimeAsync(UPDATE_TIMEOUT_MS)
    await pending

    expect(state.updating.value).toBe(false)
    expect(state.failed.value).toBe(true)
    expect(reload).not.toHaveBeenCalled()

    current.registration.waiting = null
    await state.applyUpdate()

    expect(state.failed.value).toBe(false)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('reloads once when both the plugin and browser report completion', async () => {
    const current = fixture()
    const { state, reload } = updateState(current)
    const pending = state.applyUpdate()
    await state.applyUpdate()

    expect(current.waiting.postMessage).toHaveBeenCalledOnce()

    current.waiting.state = 'activated'
    current.waiting.dispatchEvent(new Event('statechange'))
    state.reloadIfUpdating()
    await pending
    state.reloadIfUpdating()
    await state.applyUpdate()

    expect(reload).toHaveBeenCalledOnce()
    expect(state.updating.value).toBe(false)
  })

  it('does not reload an ongoing game without the player choosing to update', () => {
    const { state, reload } = updateState(fixture())
    state.reloadIfUpdating()

    expect(reload).not.toHaveBeenCalled()
    expect(state.updating.value).toBe(false)
  })

  it('unlocks the game when activation fails', async () => {
    const current = fixture()
    const { state, reload } = updateState(current)
    current.waiting.postMessage.mockImplementation(() => {
      throw new Error('Activation failed')
    })

    await state.applyUpdate()

    expect(state.updating.value).toBe(false)
    expect(state.failed.value).toBe(true)
    expect(reload).not.toHaveBeenCalled()
  })

  it('does not reload from a late worker event after disposal', async () => {
    const current = fixture()
    const { state, scope, reload } = updateState(current)
    const pending = state.applyUpdate()
    scope.stop()
    await pending
    current.waiting.state = 'activated'
    current.waiting.dispatchEvent(new Event('statechange'))
    state.reloadIfUpdating()

    expect(reload).not.toHaveBeenCalled()
    expect(state.updating.value).toBe(false)
    expect(state.failed.value).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})
