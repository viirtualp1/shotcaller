// @vitest-environment happy-dom
import { createApp, nextTick, ref, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomeRelease from '@/ui/components/patchNotes/HomeRelease.vue'

vi.mock('@/ui/stores/settings', () => ({ useSettingsStore: () => ({ locale: 'en' }) }))

vi.mock('@vueuse/core', async (original) => ({
  ...(await original<typeof import('@vueuse/core')>()),
  useDocumentVisibility: () => ref('visible'),
  useElementVisibility: () => ref(true),
  useMediaQuery: () => ref(false),
}))

let app: App

afterEach(() => {
  app?.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const chosen = () =>
  [...document.querySelectorAll('.chapter')].findIndex(
    (chapter) => chapter.getAttribute('aria-pressed') === 'true',
  )

describe('the 9.1 introduction', () => {
  it('moves through its scenes and stays on the one the player picks', async () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div id="host"></div>'
    app = createApp(HomeRelease)
    app.mount('#host')
    await nextTick()

    expect(chosen()).toBe(0)

    await vi.advanceTimersByTimeAsync(6000)
    expect(chosen()).toBe(1)

    document.querySelectorAll<HTMLButtonElement>('.chapter')[2]!.click()
    await vi.advanceTimersByTimeAsync(12000)
    expect(chosen()).toBe(2)
    expect(document.querySelectorAll('.device.desktop .contracts.focused')).toHaveLength(1)
    expect(document.querySelector('.device.phone .tabs .active')?.textContent).toContain('Career')
  })
})
