import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { nextTick, reactive, ref, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import { useFeedbackStore } from '@/ui/stores/feedback'

const storage = new Map<string, string>()
const sendFeedback = vi.fn()

const cloud = {
  enabled: true,
  connect: vi.fn(async () => ({ sendFeedback })),
}

const settings = reactive({ locale: 'en' })

vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/stores/settings', () => ({ useSettingsStore: () => settings }))

vi.mock('@vueuse/core', async (original) => ({
  ...(await original<typeof import('@vueuse/core')>()),
  useLocalStorage: (
    key: string,
    initial: unknown,
    options: { serializer: { read: (raw: string) => unknown; write: (value: unknown) => string } },
  ) => {
    const raw = storage.get(key)
    const state = ref(raw ? options.serializer.read(raw) : initial)
    watch(state, (value) => storage.set(key, options.serializer.write(value)), {
      deep: true,
      flush: 'sync',
    })

    return state
  },
}))

function restart() {
  const pinia = getActivePinia()
  if (pinia) {
    disposePinia(pinia)
  }

  setActivePinia(createPinia())

  return useFeedbackStore()
}

beforeEach(() => {
  storage.clear()
  vi.clearAllMocks()
  sendFeedback.mockResolvedValue(undefined)
  setActivePinia(createPinia())
})

afterEach(() => {
  disposePinia(getActivePinia()!)
})

describe('feedback drafts', () => {
  it('restores every field after the screen and store are recreated', async () => {
    const feedback = useFeedbackStore()
    Object.assign(feedback.draft, {
      kind: 'idea',
      subject: 'Idea',
      message: 'Remember this draft',
      email: 'me@example.test',
    })

    await nextTick()

    expect(restart().draft).toMatchObject({
      kind: 'idea',
      subject: 'Idea',
      message: 'Remember this draft',
      email: 'me@example.test',
    })
  })

  it('keeps failed submissions and reuses the request ID after a reload', async () => {
    const feedback = useFeedbackStore()
    Object.assign(feedback.draft, {
      subject: 'UI',
      message: '1234567890',
    })

    sendFeedback.mockRejectedValueOnce(new Error('connection'))
    await feedback.submit()
    const first = sendFeedback.mock.calls[0]![0]
    expect(feedback.problem).toBe('failed')
    expect(feedback.draft.message).toBe('1234567890')

    const restored = restart()
    await restored.submit()
    expect(sendFeedback.mock.calls[1]![0].id).toBe(first.id)
    expect(restored.sent).toBe(true)

    expect(restart().draft).toMatchObject({
      subject: '',
      message: '',
      email: '',
      attempt: null,
    })
  })

  it('creates a new request ID when a failed draft is edited', async () => {
    const feedback = useFeedbackStore()
    Object.assign(feedback.draft, {
      subject: 'UI',
      message: '1234567890',
    })

    sendFeedback.mockRejectedValueOnce(new Error('connection'))
    await feedback.submit()
    feedback.draft.message = 'A different message'
    await feedback.submit()

    expect(sendFeedback.mock.calls[1]![0].id).not.toBe(sendFeedback.mock.calls[0]![0].id)
  })

  it('recovers from damaged storage and does not submit whitespace as a valid message', async () => {
    storage.set(STORAGE_KEYS.feedbackDraft, '{broken')
    const feedback = useFeedbackStore()
    Object.assign(feedback.draft, {
      subject: 'UI',
      message: '          ',
    })

    await feedback.submit()

    expect(feedback.valid).toBe(false)
    expect(sendFeedback).not.toHaveBeenCalled()
  })
})
