import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HAPTICS } from '@/ui/haptics'
import { useHaptics } from '@/ui/composables/useHaptics'

const mocks = vi.hoisted(() => ({
  settings: { vibration: true },
  match: { notice: null as { kind: string } | null },
}))

vi.mock('@/ui/stores/settings', () => ({ useSettingsStore: () => mocks.settings }))
vi.mock('@/ui/stores/match', () => ({ useMatchStore: () => mocks.match }))

describe('phone haptics', () => {
  const vibrate = vi.fn(() => true)

  beforeEach(() => {
    mocks.settings.vibration = true
    mocks.match.notice = null
    vibrate.mockClear()
    vi.stubGlobal('navigator', { vibrate })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('buzzes a placed hero and stays still once vibration is off', () => {
    const { buzzIfAccepted } = useHaptics()
    buzzIfAccepted('drop', () => {})
    expect(vibrate).toHaveBeenCalledWith(HAPTICS.drop)

    mocks.settings.vibration = false
    buzzIfAccepted('drop', () => {})
    expect(vibrate).toHaveBeenCalledTimes(1)
  })

  it('does not buzz a move the match refuses', () => {
    const { buzzIfAccepted } = useHaptics()

    buzzIfAccepted('drop', () => {
      mocks.match.notice = { kind: 'error' }
    })

    expect(vibrate).not.toHaveBeenCalled()
  })

  it('does nothing where the browser has no vibration', () => {
    vi.stubGlobal('navigator', {})
    const { buzz } = useHaptics()

    expect(() => buzz('roundWon')).not.toThrow()
  })
})
