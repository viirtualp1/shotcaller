import { z } from 'zod'
import { HERO_IDS, type HeroId } from '@/content/ids'
import { applyRecord, withSettledRatings, type MatchRecord, type Profile } from '@/domain/profile/Profile'
import { matchRecordSchema } from '../persistence/profileSnapshot'
import { STORAGE_KEYS } from '../persistence/storageKeys'
import type { CloudProfile, CloudStore } from './CloudStore'

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface Identity {
  readonly name: string
  readonly avatar: HeroId | null
  readonly zoomHintSeen?: boolean
}

/** What this device knows about its profile's place in the cloud. */
export interface SyncState {
  /** The account the local profile belongs to; null until it was synced once. */
  readonly userId: string | null
  /** The cloud revision the local profile is built on. */
  readonly revision: number
  /** Matches finished here since that revision, oldest first. */
  readonly pending: readonly MatchRecord[]
  /** A name or avatar picked here since that revision. */
  readonly identity: Identity | null
}

export type SyncOutcome =
  | { readonly kind: 'synced'; readonly profile: Profile }
  /** This device and the account both have progress; the player picks one. */
  | { readonly kind: 'conflict'; readonly local: Profile; readonly cloud: CloudProfile }

const EMPTY: SyncState = {
  userId: null,
  revision: 0,
  pending: [],
  identity: null,
}

const stateSchema = z.object({
  userId: z.string().nullable(),
  revision: z.int().nonnegative(),
  pending: z.array(matchRecordSchema),
  identity: z
    .object({
      name: z.string(),
      avatar: z.enum(HERO_IDS).nullable(),
      zoomHintSeen: z.boolean().optional(),
    })
    .nullable(),
})

/** Several devices racing to save give up after this many rounds of reload and replay. */
const MAX_ATTEMPTS = 4

export const isBlank = (profile: Profile) =>
  profile.totals.matches === 0 && profile.name === '' && profile.avatar === null

export class ConflictLoopError extends Error {
  constructor() {
    super('The cloud profile kept changing while saving')
  }
}

/**
 * Keeps the local profile and the account's cloud profile in step. The game always plays on the
 * local profile; matches and name changes made here are queued and replayed on top of the newest
 * cloud profile, so progress from two devices adds up instead of one overwriting the other.
 */
export class ProfileSync {
  private current: SyncState

  constructor(
    private readonly storage: KeyValueStorage = globalThis.localStorage,
    private readonly key: string = STORAGE_KEYS.cloudSync,
  ) {
    this.current = this.read()
  }

  get state() {
    return this.current
  }

  /** True when something here has not reached the cloud yet. */
  get hasWork() {
    return this.current.pending.length > 0 || this.current.identity !== null
  }

  noteMatch(record: MatchRecord) {
    this.write({
      ...this.current,
      pending: [...this.current.pending, record],
    })
  }

  noteIdentity(identity: Identity) {
    this.write({
      ...this.current,
      identity,
    })
  }

  /** Forgets the account, for signing out. */
  reset() {
    this.write(EMPTY)
  }

  /** `current` reads the local profile, which always includes every queued match. */
  async sync(store: CloudStore, userId: string, current: () => Profile): Promise<SyncOutcome> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      /* Taken together and before any await: matches finished while saving belong to the next round. */
      const sent = this.current
      const local = current()
      const cloud = await store.load()
      const rated = await this.settledRatings(store)

      if (!cloud) {
        const created = await store.create(rated(local))
        if (created === 'conflict') {
          continue
        }

        await store.addMatches(local.recent)

        return this.settle(userId, created.revision, rated(local), sent)
      }

      if (sent.userId !== userId) {
        if (!isBlank(local)) {
          return {
            kind: 'conflict',
            local,
            cloud,
          }
        }

        return this.settle(userId, cloud.revision, rated(cloud.profile), sent)
      }

      const next = rated(this.replay(cloud.profile, sent))
      if (!sent.pending.length && !sent.identity) {
        return this.settle(userId, cloud.revision, next, sent)
      }

      await store.addMatches(sent.pending)
      const saved = await store.save(next, cloud.revision)
      if (saved !== 'conflict') {
        return this.settle(userId, saved.revision, next, sent)
      }
    }

    throw new ConflictLoopError()
  }

  /** Settles a conflict: keep the account's progress or overwrite it with this device's. */
  async resolve(
    store: CloudStore,
    userId: string,
    keep: 'cloud' | 'device',
    current: () => Profile,
  ): Promise<Profile> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const sent = this.current
      const local = current()
      const cloud = await store.load()
      const rated = await this.settledRatings(store)

      if (keep === 'cloud' && cloud) {
        const kept = rated({
          ...cloud.profile,
          zoomHintSeen: cloud.profile.zoomHintSeen || (sent.userId === userId && local.zoomHintSeen) || false,
        })

        if (kept.zoomHintSeen && !cloud.profile.zoomHintSeen) {
          const saved = await store.save(kept, cloud.revision)
          if (saved === 'conflict') {
            continue
          }

          return this.settle(userId, saved.revision, kept, sent).profile
        }

        return this.settle(userId, cloud.revision, kept, sent).profile
      }

      const kept = rated({
        ...local,
        zoomHintSeen: local.zoomHintSeen || (sent.userId === userId && cloud?.profile.zoomHintSeen) || false,
      })

      const saved = cloud ? await store.save(kept, cloud.revision) : await store.create(kept)
      if (saved === 'conflict') {
        continue
      }

      await store.addMatches(local.recent)

      return this.settle(userId, saved.revision, kept, sent).profile
    }

    throw new ConflictLoopError()
  }

  /** Puts the server's ratings on a profile; a failed lookup keeps this device's until the next sync. */
  private async settledRatings(store: CloudStore) {
    const settled = await store.ratings().catch(() => null)

    return (profile: Profile) => (settled ? withSettledRatings(profile, settled) : profile)
  }

  /** Records what reached the cloud; anything queued while saving stays queued and stays visible. */
  private settle(userId: string, revision: number, profile: Profile, sent: SyncState) {
    const now = this.current

    const left: SyncState = {
      userId,
      revision,
      pending: now.pending.slice(sent.pending.length),
      identity: now.identity === sent.identity ? null : now.identity,
    }

    this.write(left)

    return {
      kind: 'synced' as const,
      profile: this.replay(profile, left),
    }
  }

  private replay(base: Profile, state: Pick<SyncState, 'pending' | 'identity'>) {
    const played = state.pending.reduce((profile, record) => applyRecord(profile, record).profile, base)
    return state.identity
      ? {
          ...played,
          ...state.identity,
          zoomHintSeen: played.zoomHintSeen || state.identity.zoomHintSeen || false,
        }
      : played
  }

  private read(): SyncState {
    try {
      const raw = this.storage.getItem(this.key)
      const parsed = raw ? stateSchema.safeParse(JSON.parse(raw)) : null
      return parsed?.success ? parsed.data : EMPTY
    } catch {
      return EMPTY
    }
  }

  private write(state: SyncState) {
    this.current = state

    try {
      this.storage.setItem(this.key, JSON.stringify(state))
    } catch {
      /* the queue then lives only in memory until the next save succeeds */
    }
  }
}
