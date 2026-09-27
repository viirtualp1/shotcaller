import type { MatchState } from '@/domain/match/Match'
import { parseSnapshot, serializeSnapshot } from './snapshot'
import { STORAGE_KEYS } from './storageKeys'

export interface MatchRepository {
  load(): MatchState | null
  save(state: MatchState): void
  clear(): void
}

/**
 * Storage can be unavailable (private windows, blocked site data, full quota).
 * Saving is a convenience, so failures are swallowed and the game keeps running.
 */
export class LocalStorageMatchRepository implements MatchRepository {
  constructor(private readonly key: string = STORAGE_KEYS.match) {}

  load(): MatchState | null {
    try {
      const raw = globalThis.localStorage.getItem(this.key)
      return raw ? parseSnapshot(raw) : null
    } catch {
      return null
    }
  }

  save(state: MatchState): void {
    try {
      globalThis.localStorage.setItem(this.key, serializeSnapshot(state))
    } catch {
      /* see class comment */
    }
  }

  clear(): void {
    try {
      globalThis.localStorage.removeItem(this.key)
    } catch {
      /* see class comment */
    }
  }
}
