/** Short buzzes for the moments a phone should feel; durations in milliseconds, as `navigator.vibrate` takes them. */
export const HAPTICS = {
  /** A hero or item lifts off under the finger. */
  pickUp: 8,
  /** It lands on a lane, a hero or the bench. */
  drop: 16,
  promoted: [18, 60, 28],
  roundWon: [24, 70, 40],
  roundLost: 70,
} as const satisfies Record<string, number | readonly number[]>

export type Haptic = keyof typeof HAPTICS

/** Phones with a vibration motor: Android browsers and the Google Play app. iPhones have no web vibration. */
export function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function vibrate(haptic: Haptic) {
  if (!canVibrate()) {
    return
  }

  try {
    navigator.vibrate(HAPTICS[haptic] as number | number[])
  } catch {
    /* A browser that blocks vibration before the first tap throws in some versions; the buzz is only a nicety. */
  }
}
