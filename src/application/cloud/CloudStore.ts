import type { MatchRecord, Profile, SettledRatings } from '@/domain/profile/Profile'

export interface CloudProfile {
  readonly profile: Profile
  /** Bumped on every save, so two devices cannot overwrite each other unnoticed. */
  readonly revision: number
}

/** The signed-in coach's rows in the cloud. Every call acts on the current account only. */
export interface CloudStore {
  /** The profile row, or null when this account has never saved one. */
  load(): Promise<CloudProfile | null>
  /** Creates the profile row; `'conflict'` when another device created it first. */
  create(profile: Profile): Promise<CloudProfile | 'conflict'>
  /** Saves on top of `baseRevision`; `'conflict'` when another device saved in between. */
  save(profile: Profile, baseRevision: number): Promise<CloudProfile | 'conflict'>
  /** Archives finished matches; ones already stored are skipped. */
  addMatches(records: readonly MatchRecord[]): Promise<void>
  /** Ratings the server settled from this account's duels; null before it has any. */
  ratings(): Promise<SettledRatings | null>
}

export interface CloudAccount {
  readonly id: string
  /** A guest account lives on this device only until an email or Google is linked. */
  readonly anonymous: boolean
  readonly email: string | null
  /** The picture of a Google account, if it has one. */
  readonly photo: string | null
}

/** `link` attaches an email or Google to the current guest account, `signIn` switches to an existing account. */
export type AccountMode = 'link' | 'signIn'
