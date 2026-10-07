// @vitest-environment happy-dom
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { createApp, nextTick, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PatchNotesScreen from '@/ui/screens/PatchNotesScreen.vue'
import { usePatchNotesStore } from '@/ui/stores/patchNotes'
import { useSettingsStore } from '@/ui/stores/settings'
import { LATEST_PATCH } from '@/ui/patchNotes/notes'
import { i18n } from '@/ui/i18n'

vi.mock('@/ui/directives/opticalAlign', () => ({ vOpticalAlign: {} }))

let app: App | undefined
let pinia: Pinia
const initialLocale = i18n.global.locale.value

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  localStorage.clear()
  useSettingsStore().locale = 'en'
})

afterEach(() => {
  app?.unmount()
  app = undefined
  disposePinia(pinia)
  document.body.innerHTML = ''
  window.history.replaceState(null, '', '/')
  i18n.global.locale.value = initialLocale
})

function mount(version: string) {
  window.history.replaceState(null, '', '/patches/' + version)
  app = createApp(PatchNotesScreen).use(pinia).use(i18n)
  app.mount(document.body.appendChild(document.createElement('div')))
}

describe('older patch notice', () => {
  it('shows the installed patch with a notice above its version when the requested patch is missing', async () => {
    mount('999.0')
    const heading = document.querySelector('h1')!
    const notice = document.querySelector('[role="status"]')!
    expect(heading.textContent).toBe(LATEST_PATCH.version)
    expect(notice.textContent).toContain('You may be viewing an older patch')
    expect(notice.textContent).toContain('Wait for the Update button to appear')
    expect(notice.textContent).toContain('999.0')
    expect(notice.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(notice.querySelector('button')).toBeNull()
    expect(window.location.pathname).toBe('/patches/999.0')

    useSettingsStore().locale = 'ru'
    await nextTick()
    expect(notice.textContent).toContain('Возможно, это старый патч')
    expect(notice.textContent).toContain('Подожди, пока появится кнопка «Обновить»')
  })

  it('shows no notice for an available patch and clears it after an explicit selection', async () => {
    mount('999.0')
    usePatchNotesStore().select(LATEST_PATCH.version)
    await nextTick()
    expect(document.querySelector('[role="status"]')).toBeNull()
    expect(document.querySelector('h1')?.textContent).toBe(LATEST_PATCH.version)
  })
})
