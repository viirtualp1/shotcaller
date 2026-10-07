// @vitest-environment happy-dom
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { createApp, nextTick, reactive, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReleaseNotice from '@/ui/components/common/ReleaseNotice.vue'
import { useGameUpdateStore } from '@/ui/stores/gameUpdate'
import { i18n } from '@/ui/i18n'

const match = reactive({ isDuel: false })
vi.mock('@/ui/stores/match', () => ({ useMatchStore: () => match }))

let app: App | undefined
let pinia: Pinia
const initialLocale = i18n.global.locale.value

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  match.isDuel = false
  i18n.global.locale.value = 'en'
})

afterEach(() => {
  app?.unmount()
  app = undefined
  disposePinia(pinia)
  document.body.innerHTML = ''
  i18n.global.locale.value = initialLocale
})

function mount(requestedVersion?: string) {
  app = createApp(ReleaseNotice, { requestedVersion }).use(pinia).use(i18n)
  app.mount(document.body.appendChild(document.createElement('div')))
}

describe('game update banner', () => {
  it('stays hidden until an update is known or a future patch is requested', async () => {
    mount()
    expect(document.querySelector('[role="status"]')).toBeNull()
    const updates = useGameUpdateStore()
    updates.latestVersion = '999.0.0'
    await nextTick()
    expect(document.body.textContent).toContain('A new version is out')
    expect(document.body.textContent).toContain(`Installed: ${updates.currentVersion} · Available: 999.0.0`)
    updates.latestVersion = updates.currentVersion
    await nextTick()
    expect(document.querySelector('[role="status"]')).toBeNull()
  })

  it('explains an unavailable patch in both languages without claiming it is installing', async () => {
    mount('999.0')
    expect(document.body.textContent).toContain('Your game may need an update')
    expect(document.body.textContent).toContain('Patch 999.0 is not included')
    expect(document.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('false')
    i18n.global.locale.value = 'ru'
    await nextTick()
    expect(document.body.textContent).toContain('Возможно, игру нужно обновить')
    expect(document.body.textContent).toContain('ещё нет патча 999.0')
  })

  it('offers updating when ready, with the action disabled during a duel', async () => {
    const updates = useGameUpdateStore()
    const update = vi.spyOn(updates, 'updateGame').mockResolvedValue()
    mount('999.0')
    const button = document.querySelector<HTMLButtonElement>('button')!
    button.click()
    expect(update).toHaveBeenCalledTimes(1)
    match.isDuel = true
    await nextTick()
    expect(button.disabled).toBe(true)
    expect(document.body.textContent).toContain('wait for the duel to end')
    button.click()
    expect(update).toHaveBeenCalledTimes(1)
  })
})
