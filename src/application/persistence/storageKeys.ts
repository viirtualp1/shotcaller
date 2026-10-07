const PREFIX = 'shotcaller'
/** Earlier names of the game; values saved under them are carried over once. */
const LEGACY_PREFIXES = ['tri-linii'] as const

export const STORAGE_KEYS = {
  match: `${PREFIX}/match`,
  feedbackDraft: `${PREFIX}/feedback-draft`,
  /** An online duel in progress, kept apart so it never replaces the saved match against the computer. */
  duel: `${PREFIX}/duel`,
  reactionsMuted: `${PREFIX}/reactions-muted`,
  systemNotifications: `${PREFIX}/system-notifications`,
  systemNotificationsPrompt: `${PREFIX}/system-notifications-prompt`,
  duelClock: `${PREFIX}/duel-clock`,
  /** The duel this device is playing, so one that ends while it is away still counts. */
  duelPlaying: `${PREFIX}/duel-playing`,
  duelReports: `${PREFIX}/duel-reports`,
  speed: `${PREFIX}/speed`,
  musicVolume: `${PREFIX}/music-volume`,
  effectsVolume: `${PREFIX}/effects-volume`,
  audioVolumeVersion: `${PREFIX}/audio-volume-version`,
  locale: `${PREFIX}/locale`,
  difficulty: `${PREFIX}/difficulty`,
  /** The game mode picked last, for the next match or duel. */
  mode: `${PREFIX}/mode`,
  tutorialCompleted: `${PREFIX}/tutorial-completed`,
  profile: `${PREFIX}/profile`,
  /** Whether the profile shows the account photo instead of a hero. */
  accountPhoto: `${PREFIX}/account-photo`,
  /** Whether lane orders, still an experiment, are offered during planning. */
  laneOrders: `${PREFIX}/lane-orders`,
  /** Experiments for matches against the computer: a rotating hero pool and round twists. */
  /* Renamed when the rule became the default, so coaches who never chose get it. */
  heroRotation: `${PREFIX}/hero-rotation-v2`,
  roundTwists: `${PREFIX}/round-twists-v2`,
  /** Whether the phone buzzes when heroes are placed, upgraded and rounds end. */
  vibration: `${PREFIX}/vibration`,
  /** Whether the map draws at a lower frame rate to save the battery. */
  batterySaver: `${PREFIX}/battery-saver`,
  cloudSync: `${PREFIX}/cloud-sync`,
  cloudSavedAt: `${PREFIX}/cloud-saved-at`,
} as const

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function migrateLegacyStorage(storage: KeyValueStorage = globalThis.localStorage) {
  try {
    for (const key of Object.values(STORAGE_KEYS)) {
      const name = key.slice(PREFIX.length)
      for (const legacy of LEGACY_PREFIXES) {
        const legacyKey = `${legacy}${name}`
        const value = storage.getItem(legacyKey)
        if (value === null) {
          continue
        }

        if (storage.getItem(key) === null) {
          storage.setItem(key, value)
        }

        storage.removeItem(legacyKey)
      }
    }
  } catch {
    /* storage may be unavailable; the game starts fresh */
  }
}
