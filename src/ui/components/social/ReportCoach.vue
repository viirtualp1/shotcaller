<script setup lang="ts">
import { Check, Flag } from '@lucide/vue'
import { computed, ref } from 'vue'
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from '@/application/social/friends'
import { useGameText } from '../../composables/useGameText'
import { useFriendsStore } from '../../stores/friends'

/** A report about a coach, sent to the moderators; the coach is not told. Google Play requires it for chat. */
const props = defineProps<{ coachId: string; name: string }>()
const emit = defineEmits<{ close: [] }>()

const friends = useFriendsStore()
const { t } = useGameText()

const reason = ref<ReportReason | null>(null)
const details = ref('')
const state = ref<'editing' | 'sending' | 'sent' | 'failed'>('editing')

const canSend = computed(() => reason.value !== null && state.value !== 'sending')

async function send() {
  if (!reason.value) {
    return
  }

  state.value = 'sending'
  state.value = (await friends.report(props.coachId, reason.value, details.value)) ? 'sent' : 'failed'
}
</script>

<template>
  <section class="report" :aria-label="t('playerReport.title', { name })">
    <template v-if="state === 'sent'">
      <p class="done" role="status"><Check :size="16" /> {{ t('playerReport.sent') }}</p>

      <div class="buttons">
        <button type="button" class="btn" @click="emit('close')">{{ t('playerReport.close') }}</button>
      </div>
    </template>

    <template v-else>
      <h3 class="title"><Flag :size="15" /> {{ t('playerReport.title', { name }) }}</h3>

      <div class="reasons" role="radiogroup" :aria-label="t('playerReport.reason')">
        <button
          v-for="option in REPORT_REASONS"
          :key="option"
          type="button"
          role="radio"
          class="reason"
          :aria-checked="reason === option"
          @click="reason = option"
        >
          {{ t(`playerReport.reasons.${option}`) }}
        </button>
      </div>

      <label class="details">
        <span>{{ t('playerReport.details') }}</span>
        <textarea v-model="details" rows="3" :maxlength="REPORT_DETAILS_MAX" />
      </label>

      <p v-if="state === 'failed'" class="failed" role="alert">{{ t('playerReport.failed') }}</p>

      <div class="buttons">
        <button type="button" class="btn ghost" @click="emit('close')">{{ t('playerReport.cancel') }}</button>

        <button type="button" class="btn primary" :disabled="!canSend" @click="send">
          {{ state === 'sending' ? t('playerReport.sending') : t('playerReport.send') }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.report {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 112, 96, 0.4);
  border-radius: var(--radius);
  background: rgba(255, 112, 96, 0.06);
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
}

.reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reason {
  padding: 6px 10px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: transparent;
  color: var(--chalk-dim);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.reason[aria-checked='true'] {
  border-color: var(--theirs);
  background: rgba(255, 112, 96, 0.18);
  color: var(--chalk);
}

.details {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--chalk-dim);
}

textarea {
  resize: vertical;
  min-height: 64px;
  padding: 8px 10px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.25);
  color: var(--chalk);
  font: inherit;
  font-size: 13px;
}

.failed {
  margin: 0;
  color: var(--theirs);
  font-size: 13px;
}

.done {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--heal);
}

.buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
