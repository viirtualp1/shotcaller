import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { nextTick, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrivacyChoices } from '@/application/cloud/privacy'
import type { MatchRecord } from '@/domain/profile/Profile'
import { createProfile } from '@/domain/profile/Profile'
import { usePrivacyStore } from '@/ui/stores/privacy'
import { duelMatch, play, WIN } from '../helpers/profile'

const cloud = reactive({
  signedIn: true,
  account: { id: 'one' },
  signInOpen: false,
  conflict: null,
  conflictDeferred: false,
  connect: vi.fn(),
})

const visibility = ref('visible')
const register = vi.fn()
vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/stores/profile', () => ({ useProfileStore: () => ({ $onAction: register }) }))

vi.mock('@vueuse/core', async (original) => ({
  ...(await original<typeof import('@vueuse/core')>()),
  useDocumentVisibility: () => visibility,
  useEventListener: () => () => undefined,
}))

const agreed: PrivacyChoices = {
  version: 2,
  telemetry: true,
  telemetrySince: '2026-09-26T00:00:00Z',
}

const refused: PrivacyChoices = {
  version: 2,
  telemetry: false,
  telemetrySince: null,
}

const record = play(createProfile('2026-09-20T00:00:00Z'), duelMatch(WIN)).record

let stored: PrivacyChoices | null

const service = {
  load: vi.fn(),
  save: vi.fn(),
  collect: vi.fn(),
}

async function settle() {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve()
  }

  await nextTick()
}

function complete(match: MatchRecord = record) {
  const callback = register.mock.lastCall![0]
  callback({
    name: 'record',
    after: (listener: (r: MatchRecord) => void) => listener(match),
  })
}

function pending<T>() {
  let resolve!: (v: T) => void

  const promise = new Promise<T>((done) => {
    resolve = done
  })

  return {
    promise,
    resolve,
  }
}

beforeEach(() => {
  vi.stubEnv('VITE_TELEMETRY_ENABLED', 'true')
  setActivePinia(createPinia())
  cloud.signedIn = true
  cloud.account = { id: 'one' }
  cloud.signInOpen = false
  visibility.value = 'visible'
  stored = null
  register.mockClear()
  service.load.mockReset().mockImplementation(async () => stored)

  service.save.mockReset().mockImplementation(async (enabled: boolean) => {
    stored = enabled ? agreed : refused

    return stored
  })

  service.collect.mockReset().mockResolvedValue(undefined)
  cloud.connect.mockReset().mockResolvedValue({ privacy: () => service })
})

afterEach(() => {
  disposePinia(getActivePinia()!)
  vi.unstubAllEnvs()
})

describe('account telemetry consent', () => {
  it('starts disabled, prompts existing accounts, and never treats dismissal as consent', async () => {
    const privacy = usePrivacyStore()
    complete()
    await settle()
    expect(privacy.open).toBe(true)
    expect(service.collect).not.toHaveBeenCalled()
    privacy.dismiss()
    expect(privacy.open).toBe(false)
    complete()
    await settle()
    expect(service.save).not.toHaveBeenCalled()
    expect(service.collect).not.toHaveBeenCalled()
  })

  it('keeps refusals without prompting again or preventing gameplay records', async () => {
    const privacy = usePrivacyStore()
    await settle()
    await privacy.save(false)
    complete()
    await privacy.refresh()
    expect(privacy.open).toBe(false)
    expect(service.collect).not.toHaveBeenCalled()
    privacy.edit()
    expect(privacy.open).toBe(true)
  })

  it('submits only fresh completion actions after a confirmed grant, never a history backfill', async () => {
    const privacy = usePrivacyStore()
    await settle()
    await privacy.save(true)
    expect(service.collect).not.toHaveBeenCalled()

    complete({
      ...record,
      playedAt: '2026-09-25T00:00:00Z',
    })

    complete()
    await settle()
    expect(service.collect).toHaveBeenCalledTimes(1)
    expect(service.collect.mock.lastCall?.[0]).toBe(record.id)
  })

  it('does not load, prompt or collect for guests or when rollout is disabled', async () => {
    cloud.signedIn = false
    const privacy = usePrivacyStore()
    complete()
    await settle()
    expect(privacy.open).toBe(false)
    expect(service.load).not.toHaveBeenCalled()
    expect(service.collect).not.toHaveBeenCalled()
    disposePinia(getActivePinia()!)
    setActivePinia(createPinia())
    vi.stubEnv('VITE_TELEMETRY_ENABLED', 'false')
    cloud.signedIn = true
    const disabled = usePrivacyStore()
    await settle()
    expect(disabled.open).toBe(false)
    expect(service.load).not.toHaveBeenCalled()
  })

  it('pauses immediately during withdrawal and stays disabled if saving fails', async () => {
    stored = agreed
    const privacy = usePrivacyStore()
    await settle()
    const save = pending<PrivacyChoices>()
    service.save.mockReturnValueOnce(save.promise)
    const saving = privacy.save(false)
    complete()
    await settle()
    expect(service.collect).not.toHaveBeenCalled()
    save.resolve(refused)
    await saving
    complete()
    await settle()
    expect(service.collect).not.toHaveBeenCalled()
    service.save.mockRejectedValueOnce(new Error('offline'))
    await privacy.save(true)
    expect(privacy.error).toBe(true)
    complete()
    await settle()
    expect(service.collect).not.toHaveBeenCalled()
  })

  it('requires review for a changed purpose version and fails closed on consent errors', async () => {
    stored = {
      ...agreed,
      version: 1,
    }

    const privacy = usePrivacyStore()
    await settle()
    expect(privacy.open).toBe(true)
    complete()
    await settle()
    expect(service.collect).not.toHaveBeenCalled()
    service.load.mockRejectedValueOnce(new Error('migration not deployed'))
    await privacy.refresh()
    expect(privacy.error).toBe(true)
    complete()
    await settle()
    expect(service.collect).not.toHaveBeenCalled()
  })

  it('ignores a previous account load arriving after the account switches', async () => {
    const old = pending<PrivacyChoices>()
    service.load.mockReturnValueOnce(old.promise)
    const privacy = usePrivacyStore()
    await settle()
    cloud.account = { id: 'two' }
    await settle()
    expect(privacy.choices).toBeNull()
    old.resolve(agreed)
    await settle()
    expect(privacy.choices).toBeNull()
    complete()
    await settle()
    expect(service.collect).not.toHaveBeenCalled()
  })

  it('invalidates pending submissions and preference saves on sign-out', async () => {
    stored = agreed
    const privacy = usePrivacyStore()
    await settle()
    const connection = pending<{ privacy: () => typeof service }>()
    cloud.connect.mockReturnValueOnce(connection.promise)
    complete()
    cloud.signedIn = false
    connection.resolve({ privacy: () => service })
    await settle()
    expect(service.collect).not.toHaveBeenCalled()
    expect(privacy.choices).toBeNull()
    cloud.signedIn = true
    await settle()
    const save = pending<PrivacyChoices>()
    service.save.mockReturnValueOnce(save.promise)
    const saving = privacy.save(true)
    await settle()
    cloud.signedIn = false
    save.resolve(agreed)
    await saving
    expect(privacy.choices).toBeNull()
    expect(privacy.open).toBe(false)
  })
})
