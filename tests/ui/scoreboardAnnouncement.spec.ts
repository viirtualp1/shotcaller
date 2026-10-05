// @vitest-environment happy-dom
import { effectScope, nextTick, shallowRef, type EffectScope, type ShallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatchView } from '@/application/views'
import { useScoreboardAnnouncement } from '@/ui/composables/useScoreboardAnnouncement'

type PlanningSnapshot = Pick<MatchView, 'round' | 'phase' | 'twist'> & {
  lane?: string
  order?: string
}

let scope: EffectScope

function mount(view: ShallowRef<PlanningSnapshot>) {
  scope = effectScope()

  return scope.run(() => useScoreboardAnnouncement(() => view.value))!
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  scope.stop()
  vi.useRealTimers()
})

describe('scoreboard announcements', () => {
  it('reveals on entering and re-entering a saved match, then closes', async () => {
    const view = shallowRef<PlanningSnapshot>({
      round: 4,
      phase: 'planning',
      twist: null,
    })

    const visible = mount(view)
    expect(visible.value).toBe(true)

    await vi.advanceTimersByTimeAsync(3500)
    expect(visible.value).toBe(false)

    scope.stop()
    const resumed = mount(view)
    expect(resumed.value).toBe(true)
  })

  it('neither extends nor reopens for hero placement or lane command snapshots', async () => {
    const view = shallowRef<PlanningSnapshot>({
      round: 4,
      phase: 'planning',
      twist: null,
    })

    const visible = mount(view)

    await vi.advanceTimersByTimeAsync(3000)

    view.value = {
      ...view.value,
      lane: 'top',
    }

    await nextTick()
    await vi.advanceTimersByTimeAsync(500)
    expect(visible.value).toBe(false)

    view.value = {
      ...view.value,
      order: 'push',
    }

    await nextTick()
    expect(visible.value).toBe(false)

    view.value = {
      ...view.value,
      lane: 'bot',
      order: 'hold',
    }

    await nextTick()
    expect(visible.value).toBe(false)
  })

  it('reveals at battle start, round end and the next round', async () => {
    const view = shallowRef<PlanningSnapshot>({
      round: 4,
      phase: 'planning',
      twist: null,
    })

    const visible = mount(view)

    for (const phase of ['battle', 'summary', 'planning', 'battle', 'finished'] as const) {
      await vi.advanceTimersByTimeAsync(3500)
      expect(visible.value).toBe(false)

      view.value = {
        ...view.value,
        phase,
        round: phase === 'planning' ? 5 : view.value.round,
      }

      await nextTick()
      expect(visible.value).toBe(true)
    }
  })

  it('allows time to read the opening twist without triggering on twist-only updates', async () => {
    const view = shallowRef<PlanningSnapshot>({
      round: 4,
      phase: 'planning',
      twist: 'fog',
    })

    const visible = mount(view)

    await vi.advanceTimersByTimeAsync(3500)
    expect(visible.value).toBe(true)

    await vi.advanceTimersByTimeAsync(3500)
    expect(visible.value).toBe(false)

    view.value = {
      ...view.value,
      twist: 'bloodMoon',
    }

    await nextTick()
    expect(visible.value).toBe(false)
  })
})
