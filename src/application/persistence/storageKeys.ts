const PREFIX = 'shotcaller'
/** Earlier names of the game; values saved under them are carried over once. */
const LEGACY_PREFIXES = ['tri-linii'] as const

export const STORAGE_KEYS = {
  match: `${PREFIX}/match`,
  speed: `${PREFIX}/speed`,
  locale: `${PREFIX}/locale`,
  difficulty: `${PREFIX}/difficulty`,
  tutorialCompleted: `${PREFIX}/tutorial-completed`,
  patchNotesSeen: `${PREFIX}/patch-notes-seen`,
  profile: `${PREFIX}/profile`,
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
