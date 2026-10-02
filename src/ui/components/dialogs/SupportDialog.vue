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
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import { version as APP_VERSION } from '../../../../package.json'
import { FEEDBACK_KINDS, FEEDBACK_LIMITS } from '@/application/feedback'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useVisibleViewport } from '../../composables/useVisibleViewport'
import { useCloudStore } from '../../stores/cloud'
import { useFeedbackStore } from '../../stores/feedback'

const open = defineModel<boolean>('open', { required: true })

const cloud = useCloudStore()
const feedback = useFeedbackStore()
const { draft, busy, sent, problem, valid } = storeToRefs(feedback)
const { t } = useGameText()
const viewport = useVisibleViewport()
useModal(open)

watch(open, (shown) => {
  if (shown) {
    feedback.reopen()
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

        <DialogDescription :class="sent ? 'sr-only' : 'intro'">{{
          t(sent ? 'support.successNote' : 'support.intro')
        }}</DialogDescription>

        <div v-if="sent" class="success" role="status">
          <Check :size="28" aria-hidden="true" />
          <strong>{{ t('support.success') }}</strong>
          <p>{{ t('support.successNote') }}</p>
        </div>

        <form v-else class="form" @submit.prevent="feedback.submit">
          <p v-if="!cloud.enabled" class="problem" role="status">{{ t('support.unavailable') }}</p>

          <label class="field">
            <span>{{ t('support.category') }}</span>

            <select v-model="draft.kind" :disabled="busy">
              <option v-for="category in FEEDBACK_KINDS" :key="category" :value="category">
                {{ t(`support.categories.${category}`) }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>{{ t('support.subject') }}</span>

            <input
              v-model="draft.subject"
              :maxlength="FEEDBACK_LIMITS.subject"
              :minlength="FEEDBACK_LIMITS.subjectMin"
              aria-describedby="feedback-subject-count"
              required
              :disabled="busy"
            />

            <small
              id="feedback-subject-count"
              class="counter"
              :class="{ ready: draft.subject.trim().length >= FEEDBACK_LIMITS.subjectMin }"
            >
              {{
                t('support.characterCount', {
                  count: draft.subject.trim().length,
                  min: FEEDBACK_LIMITS.subjectMin,
                  max: FEEDBACK_LIMITS.subject,
                })
              }}
            </small>
          </label>

          <label class="field">
            <span>{{ t('support.message') }}</span>

            <textarea
              v-model="draft.message"
              rows="5"
              :maxlength="FEEDBACK_LIMITS.message"
              :minlength="FEEDBACK_LIMITS.messageMin"
              aria-describedby="feedback-message-count"
              :placeholder="t('support.messageHint')"
              :disabled="busy"
              required
            />

            <small
              id="feedback-message-count"
              class="counter"
              :class="{ ready: draft.message.trim().length >= FEEDBACK_LIMITS.messageMin }"
            >
              {{
                t('support.characterCount', {
                  count: draft.message.trim().length,
                  min: FEEDBACK_LIMITS.messageMin,
                  max: FEEDBACK_LIMITS.message,
                })
              }}
            </small>
          </label>

          <label class="field">
            <span>{{ t('support.email') }}</span>

            <input
              v-model="draft.email"
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
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

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

.counter {
  color: var(--chalk-dim);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.counter.ready {
  color: var(--heal);
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
