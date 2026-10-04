// @vitest-environment happy-dom
import { TooltipProvider } from 'reka-ui'
import { createApp, h, nextTick, reactive, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TwistId } from '@/content/experiments'
import ExperimentChips from '@/ui/components/hud/ExperimentChips.vue'
import { i18n } from '@/ui/i18n'

const match = reactive({
  view: {
    twist: 'fog' as TwistId,
    rotation: null,
  },
})

vi.mock('@/ui/stores/match', () => ({ useMatchStore: () => match }))
vi.mock('@/ui/stores/settings', () => ({ useSettingsStore: () => ({ locale: 'en' }) }))

let app: App

afterEach(() => {
  app?.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('round twist announcement', () => {
  it('announces a changed effect once and keeps the new chip after the announcement ends', async () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div id="host"></div>'
    app = createApp({ render: () => h(TooltipProvider, {}, () => h(ExperimentChips)) }).use(i18n)
    app.mount('#host')
    expect(document.querySelector('[role="status"]')).toBeNull()
    match.view.twist = 'bloodMoon'
    await nextTick()
    expect(document.querySelector('[role="status"]')?.textContent).toContain('New round twist')
    expect(document.querySelector('[role="status"]')?.textContent).toContain('25%')
    await vi.advanceTimersByTimeAsync(7500)
    expect(document.querySelector('[role="status"]')).toBeNull()
    expect(document.querySelector('.chip.twist')?.textContent).toContain('Blood Moon')
  })
})
