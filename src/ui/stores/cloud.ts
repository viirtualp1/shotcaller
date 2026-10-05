import { StorageSerializers, useDocumentVisibility, useEventListener, useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import type { AccountMode, CloudAccount, CloudProfile } from '@/application/cloud/CloudStore'
import { cloudConfig } from '@/application/cloud/config'
import { sendEmailCode } from '@/application/cloud/emailSignIn'
import { isBlank, ProfileSync } from '@/application/cloud/ProfileSync'
import { IN_DISCORD } from '@/application/discord'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import type { SteamBridge } from '@/application/steam'
import type { SupabaseCloud } from '@/application/cloud/SupabaseCloud'
import type { Profile } from '@/domain/profile/Profile'
import { useProfileStore } from './profile'

export type CloudStatus =
  /** No Supabase project configured: the game is local only. */
  | 'off'
  /** Configured, but nothing has been saved to an account yet. */
  | 'local'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'

export interface CloudConflict {
  readonly local: Profile
  readonly cloud: CloudProfile
}

/** Pulling what another device saved is cheap, but not worth doing on every tab switch. */
const REFRESH_EVERY_MS = 30_000

/** Cloud saves for the coach profile. The game keeps playing on the local profile; this keeps the account in step. */
export const useCloudStore = defineStore('cloud', () => {
  const config = cloudConfig(import.meta.env, IN_DISCORD ? location.origin : null)
  const sync = new ProfileSync()
  let client: Promise<SupabaseCloud> | null = null
  let running = false
  let again = false
  let syncFinished: (() => void) | null = null

  const profile = useProfileStore()

  const status = ref<CloudStatus>(config ? 'local' : 'off')
  const account = shallowRef<CloudAccount | null>(null)
  const conflict = shallowRef<CloudConflict | null>(null)
  /** The player closed the conflict dialog to decide later. */
  const conflictDeferred = ref(false)
  const syncedAt = ref<number | null>(null)

  /** When progress last actually moved between this device and the account; background checks leave it alone. */
  const savedAt = useLocalStorage<number | null>(STORAGE_KEYS.cloudSavedAt, null, {
    serializer: StorageSerializers.number,
  })

  /** The sign-in dialog, opened from the start screen or the profile. */
  const signInOpen = ref(false)
  const deleting = ref(false)
  const deleteError = ref(false)

  function connect() {
    if (!config) {
      throw new Error('Cloud saves are not configured')
    }

    client ??= import('@/application/cloud/SupabaseCloud').then(async ({ SupabaseCloud }) => {
      const cloud = await SupabaseCloud.connect(config)
      cloud.onAccountChange((next) => {
        const switched = next?.id !== account.value?.id
        account.value = next

        if (switched) {
          void syncNow()
        }
      })

      return cloud
    })

    return client
  }

  /** Worth creating a guest account for: queued changes, or progress from before cloud saves existed. */
  const needsAccount = () => sync.hasWork || (sync.state.userId === null && !isBlank(profile.profile))

  async function syncNow() {
    if (!config || conflict.value || deleting.value) {
      return
    }

    if (running) {
      again = true

      return
    }

    running = true

    try {
      const cloud = await connect()
      const user = needsAccount() ? await cloud.ensureAccount() : await cloud.account()
      account.value = user

      if (!user) {
        status.value = 'local'

        return
      }

      status.value = 'syncing'
      const hadWork = sync.hasWork
      const revision = sync.state.revision
      const outcome = await sync.sync(cloud, user.id, () => profile.profile)

      if (outcome.kind === 'conflict') {
        conflict.value = {
          local: outcome.local,
          cloud: outcome.cloud,
        }

        conflictDeferred.value = false
        status.value = 'local'

        return
      }

      profile.replace(outcome.profile)
      status.value = 'synced'
      syncedAt.value = Date.now()

      if (hadWork || sync.state.revision !== revision || savedAt.value === null) {
        savedAt.value = syncedAt.value
      }
    } catch (error) {
      status.value = globalThis.navigator?.onLine === false ? 'offline' : 'error'
      console.warn('Cloud sync failed', error)
    } finally {
      running = false
      syncFinished?.()
      syncFinished = null

      if (again) {
        again = false
        void syncNow()
      }
    }
  }

  async function resolve(keep: 'cloud' | 'device') {
    const user = account.value
    if (!config || !conflict.value || !user) {
      return
    }

    status.value = 'syncing'

    try {
      const next = await sync.resolve(await connect(), user.id, keep, () => profile.profile)
      profile.replace(next)
      conflict.value = null
      status.value = 'synced'
      syncedAt.value = Date.now()
    } catch (error) {
      status.value = 'error'
      console.warn('Could not settle the cloud conflict', error)
    }
  }

  /** Sends a code to sign in, or to sign up when the address is new; returns which one, for `verifyCode`. */
  async function sendCode(email: string) {
    const cloud = await connect()
    const mode = await sendEmailCode(cloud, email.trim())
    account.value = await cloud.account()

    return mode
  }

  async function verifyCode(email: string, code: string, mode: AccountMode) {
    const cloud = await connect()
    await cloud.verifyEmail(email.trim(), code.trim(), mode)
    account.value = await cloud.account()
    signInOpen.value = false
    void syncNow()
  }

  async function signInWithGoogle() {
    const cloud = await connect()
    await cloud.google()
  }

  /** The desktop game signs in with Steam on its own; a signed-in email account gets Steam linked to it. */
  async function signInWithSteam(steam: SteamBridge) {
    if (!config) {
      return
    }

    const ticket = await steam.ticket()

    if (!ticket) {
      return
    }

    const cloud = await connect()

    if ((await cloud.steam(ticket)) === 'signIn') {
      account.value = await cloud.account()
      void syncNow()
    }
  }

  /** The profile belongs to the account, so it leaves with it; the next save starts a new guest. */
  async function signOut() {
    await syncNow()
    const cloud = await connect()
    await cloud.signOut()
    sync.reset()
    profile.reset()
    account.value = null
    conflict.value = null
    syncedAt.value = null
    savedAt.value = null
    status.value = 'local'
  }

  async function deleteAccount() {
    if (!account.value || account.value.anonymous || deleting.value) {
      return false
    }

    deleting.value = true
    deleteError.value = false

    try {
      if (running) {
        await new Promise<void>((resolve) => (syncFinished = resolve))
      }

      await (await connect()).deleteAccount()
      sync.reset()
      profile.reset()
      account.value = null
      conflict.value = null
      syncedAt.value = null
      savedAt.value = null
      status.value = 'local'

      for (const key of [
        STORAGE_KEYS.match,
        STORAGE_KEYS.duel,
        STORAGE_KEYS.duelClock,
        STORAGE_KEYS.duelPlaying,
        STORAGE_KEYS.duelReports,
        STORAGE_KEYS.accountPhoto,
        STORAGE_KEYS.feedbackDraft,
      ]) {
        globalThis.localStorage.removeItem(key)
      }

      return true
    } catch {
      deleteError.value = true

      return false
    } finally {
      deleting.value = false
    }
  }

  if (config) {
    profile.$onAction(({ name, after }) => {
      after((result) => {
        if (name === 'record' && result) {
          sync.noteMatch(result)
        } else if (name === 'rename' || name === 'setAvatar') {
          sync.noteIdentity({
            name: profile.profile.name,
            avatar: profile.profile.avatar,
          })
        } else {
          return
        }

        void syncNow()
      })
    })

    useEventListener(globalThis, 'online', () => void syncNow())

    watch(useDocumentVisibility(), (visibility) => {
      const stale = syncedAt.value === null || Date.now() - syncedAt.value > REFRESH_EVERY_MS
      if (visibility === 'visible' && account.value && stale) {
        void syncNow()
      }
    })

    void syncNow()
  }

  return {
    enabled: config !== null,
    google: config?.google ?? false,
    status,
    account,
    conflict,
    conflictDeferred,
    syncedAt,
    savedAt,
    busy: computed(() => status.value === 'syncing'),
    syncNow,
    resolve,
    signInOpen,
    signedIn: computed(() => account.value !== null && !account.value.anonymous),
    sendCode,
    verifyCode,
    signInWithGoogle,
    signInWithSteam,
    signOut,
    deleting,
    deleteError,
    deleteAccount,
    connect,
  }
})
