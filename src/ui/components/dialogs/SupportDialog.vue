<script setup lang="ts">
import { Check, SendHorizontal, X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { version as APP_VERSION } from '../../../../package.json'
import {
  FEEDBACK_KINDS,
  FEEDBACK_LIMITS,
  feedbackFailure,
  feedbackSchema,
  type FeedbackFailure,
} from '@/application/feedback'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useVisibleViewport } from '../../composables/useVisibleViewport'
import { useCloudStore } from '../../stores/cloud'
import { useSettingsStore } from '../../stores/settings'

const open = defineModel<boolean>('open', { required: true })

const cloud = useCloudStore()
const settings = useSettingsStore()
const { t } = useGameText()
const viewport = useVisibleViewport()
useModal(open)

const kind = ref<(typeof FEEDBACK_KINDS)[number]>('bug')
const subject = ref('')
const message = ref('')
const email = ref('')
const busy = ref(false)
const sent = ref(false)
const problem = ref<FeedbackFailure | null>(null)
const attempt = ref<{ id: string; signature: string } | null>(null)

const draft = computed(() => ({
  kind: kind.value,
  subject: subject.value.trim(),
  message: message.value.trim(),
  email: email.value.trim(),
  locale: settings.locale,
  version: APP_VERSION,
}))

const valid = computed(() => feedbackSchema.omit({ id: true }).safeParse(draft.value).success)

async function submit() {
  if (!cloud.enabled || busy.value || !valid.value || sent.value) {
    return
  }

  const payload = draft.value
  const signature = JSON.stringify(payload)
  if (attempt.value?.signature !== signature) {
    attempt.value = {
      id: crypto.randomUUID(),
      signature,
    }
  }

  const request = feedbackSchema.parse({
    ...payload,
    id: attempt.value.id,
  })

  busy.value = true
  problem.value = null

  try {
    await (await cloud.connect()).sendFeedback(request)
    sent.value = true
    subject.value = ''
    message.value = ''
    email.value = ''
    attempt.value = null
  } catch (error) {
    problem.value = feedbackFailure(error)
  } finally {
    busy.value = false
  }
}

watch(open, (shown) => {
  if (shown && !busy.value) {
    sent.value = false
    problem.value = null
  }
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="sheet support" :style="viewport.style.value">
        <header class="head">
          <DialogTitle class="title hand">{{ t('support.title') }}</DialogTitle>

          <DialogClose class="btn ghost" :aria-label="t('support.close')" :disabled="busy">
            <X :size="18" />
          </DialogClose>
        </header>

        <DialogDescription class="intro">{{ t('support.intro') }}</DialogDescription>

        <div v-if="sent" class="success" role="status">
          <Check :size="28" aria-hidden="true" />
          <strong>{{ t('support.success') }}</strong>
          <p>{{ t('support.successNote') }}</p>
        </div>

        <form v-else class="form" @submit.prevent="submit">
          <p v-if="!cloud.enabled" class="problem" role="status">{{ t('support.unavailable') }}</p>

          <label class="field">
            <span>{{ t('support.category') }}</span>

            <select v-model="kind" :disabled="busy">
              <option v-for="category in FEEDBACK_KINDS" :key="category" :value="category">
                {{ t(`support.categories.${category}`) }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>{{ t('support.subject') }}</span>

            <input
              v-model="subject"
              :maxlength="FEEDBACK_LIMITS.subject"
              minlength="3"
              required
              :disabled="busy"
            />
          </label>

          <label class="field">
            <span>{{ t('support.message') }}</span>

            <textarea
              v-model="message"
              rows="5"
              :maxlength="FEEDBACK_LIMITS.message"
              minlength="20"
              :placeholder="t('support.messageHint')"
              :disabled="busy"
              required
            />
          </label>

          <label class="field">
            <span>{{ t('support.email') }}</span>

            <input
              v-model="email"
              type="email"
              autocomplete="email"
              :maxlength="FEEDBACK_LIMITS.email"
              :disabled="busy"
            />
          </label>

          <p class="info">{{ t('support.privacy', { version: APP_VERSION }) }}</p>
          <p class="info">{{ t('support.contactNote') }}</p>
          <p v-if="problem" class="problem" role="alert">{{ t(`support.errors.${problem}`) }}</p>

          <button class="btn primary" type="submit" :disabled="busy || !valid || !cloud.enabled">
            <SendHorizontal :size="16" /> {{ t(busy ? 'support.sending' : 'support.send') }}
          </button>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.support {
  top: calc(100% - var(--visible-bottom, 0px) - var(--visible-height, 100dvh) / 2);
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(520px, calc(100vw - 32px));
  max-height: calc(var(--visible-height, 100dvh) - 32px);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title {
  font-size: 38px;
  line-height: 1;
}

.intro,
.info,
.success p {
  margin: 0;
  color: var(--chalk-dim);
  font-size: 13px;
}

.form,
.field,
.success {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form {
  gap: 14px;
}

.field > span {
  font-weight: 700;
  font-size: 13px;
}

input,
select,
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--edge-strong);
  border-radius: 10px;
  background: var(--board-deep);
  color: var(--chalk);
  font: 16px/1.4 var(--font-ui);
}

textarea {
  min-height: 120px;
  resize: vertical;
}

.problem {
  margin: 0;
  color: var(--theirs);
  font-size: 13px;
}

.success {
  align-items: center;
  padding: 24px 8px;
  text-align: center;
}

.success svg {
  color: var(--heal);
}
</style>
