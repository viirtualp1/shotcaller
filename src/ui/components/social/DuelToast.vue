<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { Swords, X } from 'lucide-vue-next'
import { computed, watch } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useDuelStore, type DuelNotice } from '../../stores/duel'

/** Shows a challenge on its way out and how duels end; notices go away on their own. */
const NOTICE_MS = 7000

const duel = useDuelStore()
const { t } = useGameText()

const { start: forgetSoon } = useTimeoutFn(() => (duel.notice = null), NOTICE_MS, { immediate: false })

watch(
  () => duel.notice,
  (notice) => {
    if (notice) {
      forgetSoon()
    }
  },
)

function describe(notice: DuelNotice) {
  switch (notice.kind) {
    case 'failure':
      return t(`duel.failures.${notice.reason}`)
    case 'declined':
    case 'expired':
    case 'cancelled':
      return t(`duel.${notice.kind}`, { name: notice.name || t('profile.defaultName') })
    case 'badBoard':
      return t('duel.badBoard')
    case 'ended':
      return notice.how === 'disputed'
        ? t('duel.ended.disputed')
        : t(`duel.ended.${notice.how}${notice.won ? 'Won' : 'Lost'}`)
  }
}

const message = computed(() => (duel.notice ? describe(duel.notice) : null))
const good = computed(() => duel.notice?.kind === 'ended' && duel.notice.won)
const outgoingName = computed(() => duel.outgoing?.opponent.name || t('profile.defaultName'))
</script>

<template>
  <Transition name="toast">
    <div v-if="duel.outgoing" class="toast waiting" role="status">
      <Swords :size="16" class="icon" />

      <span>{{
        t('duel.waitingFor', { name: outgoingName, s: duel.inviteSecondsLeft(duel.outgoing) })
      }}</span>

      <button type="button" class="btn ghost small" @click="duel.cancelInvite()">
        {{ t('duel.cancel') }}
      </button>
    </div>

    <div v-else-if="message" class="toast" :class="{ good }" role="status">
      <Swords :size="16" class="icon" />

      <span>{{ message }}</span>

      <button type="button" class="icon-btn close" :aria-label="t('duel.close')" @click="duel.notice = null">
        <X :size="14" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top, 0px));
  left: 50%;
  translate: -50% 0;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: calc(100vw - 32px);
  padding: 8px 10px 8px 14px;
  border-radius: 12px;
  background: #0f1614;
  border: 1px solid var(--edge-strong);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  font-size: 13.5px;
  font-weight: 600;
  z-index: 70;
}

.toast.waiting {
  border-color: rgba(244, 197, 91, 0.5);
}

.toast.good {
  border-color: var(--heal);
}

.icon {
  flex: none;
  color: var(--gold);
}

.close {
  width: 28px;
  height: 28px;
}

.small {
  padding: 5px 10px;
  font-size: 12.5px;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
