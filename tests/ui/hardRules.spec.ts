// @vitest-environment happy-dom
import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import { DEFAULT_SANDBOX } from '@/content/sandbox'
import { useSettingsStore } from '@/ui/stores/settings'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  disposePinia(getActivePinia()!)
  localStorage.clear()
})

describe('mandatory Hard rules', () => {
  it('forces both rules despite saved preferences and restores those preferences on Standard', () => {
    localStorage.setItem(STORAGE_KEYS.heroRotation, 'false')
    localStorage.setItem(STORAGE_KEYS.roundTwists, 'false')
    const settings = useSettingsStore()
    expect(settings.heroRotation).toBe(false)
    settings.difficulty = 'hard'
    expect(settings.experimentsRequired).toBe(true)
    expect(settings.heroRotation).toBe(true)
    expect(settings.roundTwists).toBe(true)
    settings.heroRotation = false
    settings.roundTwists = false
    expect(settings.heroRotation).toBe(true)
    expect(settings.roundTwists).toBe(true)
    settings.difficulty = 'standard'
    expect(settings.experimentsRequired).toBe(false)
    expect(settings.heroRotation).toBe(false)
    expect(settings.roundTwists).toBe(false)
  })

  it('enforces both rules at match creation even when explicitly disabled', () => {
    const match = createMatch({
      difficulty: 'hard',
      rules: {
        rotation: false,
        twists: false,
      },
    })

    expect(match.rules).toEqual({
      rotation: true,
      twists: true,
    })

    expect(match.rotation).not.toBeNull()
    expect(match.twist).not.toBeNull()
  })

  it('keeps training outside mandatory solo rules', () => {
    const match = createMatch({
      difficulty: 'hard',
      sandbox: DEFAULT_SANDBOX,
    })

    expect(match.rotation).toBeNull()
    expect(match.twist).toBeNull()
  })
})
