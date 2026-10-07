// @vitest-environment happy-dom
import { createApp, nextTick, reactive, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CloudCard from '@/ui/components/profile/CloudCard.vue'
import { i18n } from '@/ui/i18n'

const cloud = reactive({
  enabled: true,
  signedIn: true,
  status: 'synced',
  savedAt: null,
  account: { email: 'coach@example.com' },
  conflict: null,
  busy: false,
})

const privacy = reactive({
  enabled: true,
  loaded: true,
  current: true,
  choices: { telemetry: false },
  error: false,
  edit: vi.fn(),
})

const menu = reactive({
  settings: true,
  newMatch: true,
})

vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/stores/privacy', () => ({ usePrivacyStore: () => privacy }))
vi.mock('@/ui/stores/menu', () => ({ useMenuStore: () => menu }))
vi.mock('@/ui/stores/settings', () => ({ useSettingsStore: () => ({ locale: 'en' }) }))
vi.mock('@/ui/composables/useModal', () => ({ useModal: () => undefined }))

const initialLocale = i18n.global.locale.value
let app: App

beforeEach(() => {
  cloud.signedIn = true
  privacy.enabled = true
  privacy.choices.telemetry = false
  privacy.edit.mockClear()
  menu.settings = true
  menu.newMatch = true
  i18n.global.locale.value = 'en'

  app = createApp(CloudCard).use(i18n)
  app.mount(document.body.appendChild(document.createElement('div')))
})

afterEach(() => {
  app.unmount()
  document.body.innerHTML = ''
  i18n.global.locale.value = initialLocale
})

describe('cloud save telemetry control', () => {
  it('opens consent settings from the icon inside cloud save', () => {
    const button = document.querySelector<HTMLButtonElement>('.cloud .telemetry')!

    expect(button.title).toBe('Gameplay telemetry · Disabled')
    expect(button.getAttribute('aria-label')).toBe(button.title)
    expect(button.textContent?.trim()).toBe('')
    button.click()
    expect(privacy.edit).toHaveBeenCalledOnce()
    expect(menu.settings).toBe(false)
    expect(menu.newMatch).toBe(false)
  })

  it('updates the accessible status in both languages', async () => {
    privacy.choices.telemetry = true
    await nextTick()

    expect(document.querySelector('.telemetry')?.getAttribute('aria-label')).toBe(
      'Gameplay telemetry · Enabled',
    )

    i18n.global.locale.value = 'ru'
    await nextTick()
    expect(document.querySelector('.telemetry')?.getAttribute('aria-label')).not.toContain('Gameplay')
  })

  it('hides the control for guests and when telemetry is disabled', async () => {
    cloud.signedIn = false
    await nextTick()
    expect(document.querySelector('.cloud')).not.toBeNull()
    expect(document.querySelector('.telemetry')).toBeNull()

    cloud.signedIn = true
    privacy.enabled = false
    await nextTick()
    expect(document.querySelector('.telemetry')).toBeNull()
  })
})
