<script setup lang="ts">
import { Check, Flag, ShieldAlert, X } from '@lucide/vue'
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
import {
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  type ReportReason,
  type ReportResult,
} from '@/application/social/friends'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useFriendsStore } from '../../stores/friends'

/** A report about a coach, sent to the moderators; the coach is not told. Google Play requires it for chat. */
const props = defineProps<{ coachId: string; name: string }>()
const open = defineModel<boolean>('open', { required: true })

const friends = useFriendsStore()
const { t } = useGameText()
useModal(open)

const reason = ref<ReportReason | ''>('')
const details = ref('')
const state = ref<'editing' | 'sending' | ReportResult>('editing')

const canSend = computed(
  () => reason.value !== '' && state.value !== 'sending' && state.value !== 'restricted',
)

async function send() {
  if (!reason.value || state.value === 'sending') {
    return
  }

  state.value = 'sending'
  state.value = await friends.report(props.coachId, reason.value, details.value)
}

watch(open, (shown) => {
  if (!shown) {
    return
  }

  reason.value = ''
  details.value = ''
  state.value = 'editing'
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay report-overlay" />

      <DialogContent class="sheet report" @open-auto-focus.prevent>
        <header class="head">
          <DialogTitle class="title"><Flag :size="18" /> {{ t('playerReport.title', { name }) }}</DialogTitle>

          <DialogClose
            class="btn ghost icon"
            :aria-label="t('playerReport.close')"
            :disabled="state === 'sending'"
          >
            <X :size="18" />
          </DialogClose>
        </header>

        <div v-if="state === 'sent'" class="success" role="status">
          <Check :size="28" aria-hidden="true" />
          <DialogDescription class="note">{{ t('playerReport.sent') }}</DialogDescription>
          <DialogClose class="btn">{{ t('playerReport.close') }}</DialogClose>
        </div>

        <form v-else class="form" @submit.prevent="send">
          <DialogDescription class="note">{{ t('playerReport.intro', { name }) }}</DialogDescription>

          <label class="field">
            <span>{{ t('playerReport.reason') }}</span>

            <select v-model="reason" required :disabled="state === 'sending'">
              <option value="" disabled>{{ t('playerReport.choose') }}</option>

              <option v-for="option in REPORT_REASONS" :key="option" :value="option">
                {{ t(`playerReport.reasons.${option}`) }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>{{ t('playerReport.details') }}</span>

            <textarea
              v-model="details"
              rows="4"
              :maxlength="REPORT_DETAILS_MAX"
              :placeholder="t('playerReport.detailsHint')"
              :disabled="state === 'sending'"
            />

            <small class="counter">{{ details.length }} / {{ REPORT_DETAILS_MAX }}</small>
          </label>

          <p class="warning">
            <ShieldAlert :size="16" aria-hidden="true" /> {{ t('playerReport.falseWarning') }}
          </p>

          <p v-if="state === 'failed' || state === 'restricted'" class="failed" role="alert">
            {{ t(`playerReport.${state}`) }}
          </p>

          <div class="buttons">
            <DialogClose type="button" class="btn ghost" :disabled="state === 'sending'">
              {{ t('playerReport.cancel') }}
            </DialogClose>

            <button type="submit" class="btn danger" :disabled="!canSend">
              {{ state === 'sending' ? t('playerReport.sending') : t('playerReport.send') }}
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* Opens over the coach's profile, which is a dialog itself. */
.report-overlay {
  z-index: 70;
}

.report {
  z-index: 71;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(460px, calc(100vw - 32px));
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin: 0;
  font-size: 18px;
  overflow-wrap: anywhere;
}

.title svg {
  flex: none;
  color: var(--theirs);
}

.icon {
  flex: none;
  width: 36px;
  height: 36px;
  padding: 0;
}

.form,
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form {
  gap: 14px;
}

.note {
  margin: 0;
  color: var(--chalk-dim);
  font-size: 13px;
  line-height: 1.5;
}

.field > span {
  font-size: 13px;
  font-weight: 700;
}

select,
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: var(--board-deep);
  color: var(--chalk);
  font: 16px/1.4 var(--font-ui);
}

textarea {
  min-height: 100px;
  resize: vertical;
}

.counter {
  align-self: flex-end;
  color: var(--chalk-faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgba(244, 197, 91, 0.35);
  border-radius: var(--radius);
  background: rgba(244, 197, 91, 0.07);
  color: var(--chalk-dim);
  font-size: 12.5px;
  line-height: 1.5;
}

.warning svg {
  flex: none;
  margin-top: 1px;
  color: var(--gold);
}

.failed {
  margin: 0;
  color: var(--theirs);
  font-size: 13px;
}

.buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.danger {
  border-color: var(--theirs);
  background: var(--theirs);
  color: var(--ink);
}

.danger:disabled {
  opacity: 0.5;
}

.success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 8px 4px;
  text-align: center;
}

.success svg {
  color: var(--heal);
}

@media (max-width: 640px) {
  .buttons > * {
    flex: 1;
  }
}
</style>
