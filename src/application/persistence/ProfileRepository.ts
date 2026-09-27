import type { Profile } from '@/domain/profile/Profile'
import { parseProfile, serializeProfile } from './profileSnapshot'
import { STORAGE_KEYS } from './storageKeys'

export interface ProfileRepository {
  load(): Profile | null
  save(profile: Profile): void
}

/** Like the match save, storage failures are swallowed: the profile then lives only for this session. */
export class LocalStorageProfileRepository implements ProfileRepository {
  constructor(private readonly key: string = STORAGE_KEYS.profile) {}

  load() {
    try {
      const raw = globalThis.localStorage.getItem(this.key)
      return raw ? parseProfile(raw) : null
    } catch {
      return null
    }
  }

  save(profile: Profile) {
    try {
      globalThis.localStorage.setItem(this.key, serializeProfile(profile))
    } catch {
      /* see class comment */
    }
  }
}
