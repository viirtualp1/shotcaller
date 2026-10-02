import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import { createProfile } from '@/domain/profile/Profile'
import { useCloudStore } from '@/ui/stores/cloud'

const mocks = vi.hoisted(() => ({
  profile: {
    profile: {} as ReturnType<typeof createProfile>,
    replace: vi.fn(),
    reset: vi.fn(),
    $onAction: vi.fn(),
  },
  service: {
    account: vi.fn(),
    ensureAccount: vi.fn(),
    onAccountChange: vi.fn(),
    deleteAccount: vi.fn(),
  },
  sync: {
    hasWork: false,
    state: {
      userId: 'coach',
      revision: 1,
    },
    sync: vi.fn(),
    reset: vi.fn(),
  },
}))

vi.mock('@/ui/stores/profile', () => ({ useProfileStore: () => mocks.profile }))

vi.mock('@/application/cloud/config', () => ({
  cloudConfig: () => ({
    url: 'https://example.test',
    key: 'public',
  }),
}))

vi.mock('@/application/cloud/SupabaseCloud', () => ({
  SupabaseCloud: { connect: async () => mocks.service },
}))

vi.mock('@/application/cloud/ProfileSync', () => ({
  isBlank: () => true,
  ProfileSync: class {
    constructor() {
      return mocks.sync
    }
  },
}))

vi.mock('@vueuse/core', async (original) => ({
  ...(await original<typeof import('@vueuse/core')>()),
  useDocumentVisibility: () => ref('visible'),
  useLocalStorage: (_key: string, value: unknown) => ref(value),
  useEventListener: () => () => undefined,
}))

const account = {
  id: 'coach',
  anonymous: false,
  email: 'coach@example.test',
  photo: null,
}

const storage = new Map<string, string>()

async function settle() {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve()
  }

  await nextTick()
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mocks.profile.profile = createProfile('2026-10-03T00:00:00Z')
  mocks.service.account.mockResolvedValue(account)
  mocks.service.deleteAccount.mockResolvedValue(undefined)

  mocks.sync.sync.mockResolvedValue({
    kind: 'synced',
    profile: mocks.profile.profile,
  })

  storage.clear()
  storage.set(STORAGE_KEYS.match, 'saved-match')
  storage.set(STORAGE_KEYS.duelReports, 'pending-reports')
  storage.set(STORAGE_KEYS.feedbackDraft, 'private-draft')
  storage.set(STORAGE_KEYS.locale, 'ru')
  vi.stubGlobal('localStorage', { removeItem: (key: string) => storage.delete(key) })
})

afterEach(() => {
  disposePinia(getActivePinia()!)
  vi.unstubAllGlobals()
})

describe('account deletion', () => {
  it('clears account progress and saved games only after deletion succeeds, retaining preferences', async () => {
    const cloud = useCloudStore(getActivePinia()!)
    await vi.dynamicImportSettled()
    await settle()
    expect(await cloud.deleteAccount()).toBe(true)
    expect(mocks.service.deleteAccount).toHaveBeenCalledTimes(1)
    expect(mocks.sync.reset).toHaveBeenCalledTimes(1)
    expect(mocks.profile.reset).toHaveBeenCalledTimes(1)
    expect(storage.has(STORAGE_KEYS.match)).toBe(false)
    expect(storage.has(STORAGE_KEYS.duelReports)).toBe(false)
    expect(storage.has(STORAGE_KEYS.feedbackDraft)).toBe(false)
    expect(storage.get(STORAGE_KEYS.locale)).toBe('ru')
    expect(cloud.account).toBeNull()
    expect(cloud.status).toBe('local')
  })

  it('preserves the account and local progress after a failed deletion and allows retry', async () => {
    const cloud = useCloudStore(getActivePinia()!)
    await vi.dynamicImportSettled()
    await settle()
    mocks.service.deleteAccount.mockRejectedValueOnce(new Error('Offline'))
    expect(await cloud.deleteAccount()).toBe(false)
    expect(cloud.deleteError).toBe(true)
    expect(cloud.account).toEqual(account)
    expect(mocks.sync.reset).not.toHaveBeenCalled()
    expect(mocks.profile.reset).not.toHaveBeenCalled()
    expect(storage.get(STORAGE_KEYS.match)).toBe('saved-match')
    expect(await cloud.deleteAccount()).toBe(true)
    expect(cloud.deleteError).toBe(false)
  })

  it('waits for an active sync and prevents duplicate deletion or another sync during deletion', async () => {
    const cloud = useCloudStore(getActivePinia()!)
    await vi.dynamicImportSettled()
    await settle()
    let finishSync!: (value: unknown) => void
    mocks.sync.sync.mockImplementationOnce(() => new Promise((resolve) => (finishSync = resolve)))
    const syncing = cloud.syncNow()
    await settle()
    const deleting = cloud.deleteAccount()
    await cloud.syncNow()
    expect(await cloud.deleteAccount()).toBe(false)
    expect(mocks.service.deleteAccount).not.toHaveBeenCalled()

    finishSync({
      kind: 'synced',
      profile: mocks.profile.profile,
    })

    await syncing
    expect(await deleting).toBe(true)
    expect(mocks.service.deleteAccount).toHaveBeenCalledTimes(1)
    expect(cloud.account).toBeNull()
  })

  it('does not delete a guest or an absent account', async () => {
    const cloud = useCloudStore(getActivePinia()!)
    await vi.dynamicImportSettled()
    await settle()

    cloud.account = {
      ...account,
      anonymous: true,
    }

    expect(await cloud.deleteAccount()).toBe(false)
    cloud.account = null
    expect(await cloud.deleteAccount()).toBe(false)
    expect(mocks.service.deleteAccount).not.toHaveBeenCalled()
  })
})
