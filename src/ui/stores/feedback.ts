import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { z } from 'zod'
import { version as APP_VERSION } from '../../../package.json'
import {
  FEEDBACK_KINDS,
  FEEDBACK_LIMITS,
  feedbackFailure,
  feedbackSchema,
  type FeedbackFailure,
} from '@/application/feedback'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import { useCloudStore } from './cloud'
import { useSettingsStore } from './settings'

const draftSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  subject: z.string().max(FEEDBACK_LIMITS.subject),
  message: z.string().max(FEEDBACK_LIMITS.message),
  email: z.string().max(FEEDBACK_LIMITS.email),
  attempt: z
    .object({
      id: z.uuid(),
      signature: z.string(),
    })
    .nullable(),
})

const emptyDraft = (): z.infer<typeof draftSchema> => ({
  kind: 'bug',
  subject: '',
  message: '',
  email: '',
  attempt: null,
})

export const useFeedbackStore = defineStore('feedback', () => {
  const cloud = useCloudStore()
  const settings = useSettingsStore()

  const draft = useLocalStorage(STORAGE_KEYS.feedbackDraft, emptyDraft(), {
    serializer: {
      read: (raw) => {
        try {
          return draftSchema.parse(JSON.parse(raw))
        } catch {
          return emptyDraft()
        }
      },
      write: (value) => JSON.stringify(value),
    },
  })

  const busy = ref(false)
  const sent = ref(false)
  const problem = ref<FeedbackFailure | null>(null)

  const payload = computed(() => ({
    kind: draft.value.kind,
    subject: draft.value.subject.trim(),
    message: draft.value.message.trim(),
    email: draft.value.email.trim(),
    locale: settings.locale,
    version: APP_VERSION,
  }))

  const valid = computed(() => feedbackSchema.omit({ id: true }).safeParse(payload.value).success)

  function reopen() {
    if (!busy.value) {
      sent.value = false
      problem.value = null
    }
  }

  async function submit() {
    if (!cloud.enabled || busy.value || !valid.value || sent.value) {
      return
    }

    const signature = JSON.stringify(payload.value)
    if (draft.value.attempt?.signature !== signature) {
      draft.value.attempt = {
        id: crypto.randomUUID(),
        signature,
      }
    }

    const request = feedbackSchema.parse({
      ...payload.value,
      id: draft.value.attempt.id,
    })

    busy.value = true
    problem.value = null

    try {
      await (await cloud.connect()).sendFeedback(request)
      draft.value = emptyDraft()
      sent.value = true
    } catch (error) {
      problem.value = feedbackFailure(error)
    } finally {
      busy.value = false
    }
  }

  return {
    draft,
    busy,
    sent,
    problem,
    valid,
    reopen,
    submit,
  }
})
