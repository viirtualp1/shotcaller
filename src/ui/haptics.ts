/**
 * Buzzes for the moments a phone should feel, in milliseconds as `navigator.vibrate` takes them. Most Android motors
 * need about 20 ms to spin up, so anything shorter is never felt.
 */
export const HAPTICS = {
  /** A tap that changes the board: a hero bought, the setting turned on. */
  tap: 20,
  /** A hero or item lifts off under the finger. */
  pickUp: 25,
  /** It lands on a lane, a hero or the bench. */
  drop: 40,
  promoted: [40, 60, 70],
  roundWon: [50, 70, 90],
  roundLost: 150,
} as const satisfies Record<string, number | readonly number[]>

export type Haptic = keyof typeof HAPTICS

/** Android browsers and the Google Play app vibrate on request. */
function hasVibration() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/** Phones that can feel a buzz from the page. */
export function canVibrate() {
  // Native iOS switches require a trusted user event; a hidden switch clicked by script cannot provide game haptics.
  return hasVibration()
}

export function vibrate(haptic: Haptic) {
  try {
    if (hasVibration()) {
      navigator.vibrate(HAPTICS[haptic] as number | number[])
    }
  } catch {
    /* A browser that blocks vibration before the first tap throws in some versions; the buzz is only a nicety. */
  }
}
