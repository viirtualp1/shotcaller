// @vitest-environment happy-dom
import { createApp, nextTick, reactive, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsFields from '@/ui/components/settings/SettingsFields.vue'
import { i18n } from '@/ui/i18n'

const hover = reactive({ value: false })

const settings = reactive({
  difficulty: 'standard',
  locale: 'en',
  laneOrders: false,
  heroRotation: false,
  roundTwists: false,
  get experimentsRequired() {
    return this.difficulty === 'hard'
  },
})

vi.mock('@vueuse/core', async (original) => ({
  ...(await original<typeof import('@vueuse/core')>()),
  useMediaQuery: () => hover,
}))

vi.mock('@/ui/stores/settings', () => ({ useSettingsStore: () => settings }))

vi.mock('@/ui/stores/audio', () => ({
  useAudioStore: () =>
    reactive({
      musicVolume: 0.1,
      effectsVolume: 0.1,
    }),
}))

vi.mock('@/ui/stores/menu', () => ({ useMenuStore: () => ({}) }))
vi.mock('@/ui/stores/patchNotes', () => ({ usePatchNotesStore: () => ({}) }))

let app: App

async function settle() {
  for (let i = 0; i < 8; i++) {
    await nextTick()
  }
}

beforeEach(() => {
  settings.difficulty = 'standard'
  hover.value = false
  document.body.innerHTML = '<div id="host"></div>'

  app = createApp(SettingsFields, {
    sound: false,
    language: false,
    showExperiments: true,
  }).use(i18n)

  app.mount('#host')
})

afterEach(() => {
  app.unmount()
  document.body.innerHTML = ''
})

describe('difficulty information', () => {
  it('disables the two mandatory rules on Hard and explains the lock', async () => {
    settings.difficulty = 'hard'
    settings.heroRotation = true
    settings.roundTwists = true
    await settle()

    const locked = document.querySelectorAll<HTMLButtonElement>(
      '.experiments button[role="checkbox"]:disabled',
    )

    expect(locked).toHaveLength(2)
    expect([...locked].every((button) => button.getAttribute('aria-checked') === 'true')).toBe(true)
    expect(document.querySelector('.required-note')?.textContent).toContain('Hard always uses')
    settings.difficulty = 'standard'
    await settle()
    expect(document.querySelectorAll('.experiments button[role="checkbox"]:disabled')).toHaveLength(0)
  })

  it('opens a mobile hint without selecting its difficulty, then selects from the separate text button', async () => {
    const info = document.querySelector<HTMLButtonElement>('.difficulty-option .about')!
    info.click()
    await settle()
    expect(settings.difficulty).toBe('standard')
    expect(document.querySelector('.experiment-info')?.textContent).toContain('No timer')
    info.click()
    await settle()
    document.querySelector<HTMLButtonElement>('.difficulty-option .segmented-option')!.click()
    await settle()
    expect(settings.difficulty).toBe('relaxed')
  })

  it('opens the desktop hint on hover without changing difficulty', async () => {
    hover.value = true
    document.querySelector('.difficulty-option .about')!.dispatchEvent(new MouseEvent('mouseenter'))
    await settle()
    expect(document.querySelector('.experiment-info')?.textContent).toContain('No timer')
    expect(settings.difficulty).toBe('standard')
  })
})
