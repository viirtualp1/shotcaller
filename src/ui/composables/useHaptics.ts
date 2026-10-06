import { vibrate, type Haptic } from '../haptics'
import { useMatchStore } from '../stores/match'
import { useSettingsStore } from '../stores/settings'

/** Buzzes the phone unless the coach turned vibration off. */
export function useHaptics() {
  const settings = useSettingsStore()
  const match = useMatchStore()

  function buzz(haptic: Haptic) {
    if (settings.vibration) {
      vibrate(haptic)
    }
  }

  /** Runs a move on the board and buzzes once the match takes it; a refused move shows its error without one. */
  function buzzIfAccepted(haptic: Haptic, move: () => void) {
    const before = match.notice
    move()

    if (match.notice === before || match.notice?.kind !== 'error') {
      buzz(haptic)
    }
  }

  return {
    buzz,
    buzzIfAccepted,
  }
}
