<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { RefreshCw } from '@lucide/vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onScopeDispose, watch } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useGameUpdateStore } from '../../stores/gameUpdate'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { useLegalStore } from '../../stores/legal'
import { useMatchStore } from '../../stores/match'
import { usePatchNotesStore } from '../../stores/patchNotes'

const UPDATE_CHECK_MS = 60 * 1000
let timer: ReturnType<typeof setInterval> | undefined

const match = useMatchStore()
const patchNotes = usePatchNotesStore()
const leaderboard = useLeaderboardStore()
const legal = useLegalStore()
const updates = useGameUpdateStore()
const { needRefresh, updating, failed, registration } = storeToRefs(updates)
const { t } = useGameText()

const inGame = computed(
  () =>
    match.view !== null &&
    !legal.document &&
    !patchNotes.patch &&
    !patchNotes.awaitingUpdate &&
    !leaderboard.isOpen,
)

function check() {
  if (document.visibilityState !== 'visible' || !navigator.onLine) {
    return
  }

  void updates.checkLatest()
  const registered = registration.value
  if (registered && !registered.installing) {
    void registered.update().catch(() => undefined)
  }
}

const { needRefresh: workerNeedsRefresh } = useRegisterSW({
  onNeedReload: updates.reloadIfUpdating,
  onRegisteredSW(_url, registered) {
    registration.value = registered
    check()
  },
})

/* While the new version installs, the veil and this listener prevent game input. */
useEventListener(
  window,
  'keydown',
  (event) => {
    if (updating.value) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  },
  { capture: true },
)

useEventListener(document, 'visibilitychange', check)
useEventListener(window, 'online', check)

watch(workerNeedsRefresh, (ready) => {
  needRefresh.value = ready
})

watch(
  () => patchNotes.awaitingUpdate && !match.isDuel && needRefresh.value,
  (ready) => {
    if (ready) {
      void updates.updateGame()
    }
  },
)

onMounted(() => {
  check()
  timer = setInterval(check, UPDATE_CHECK_MS)
})

onScopeDispose(() => clearInterval(timer))
</script>

<template>
  <Transition name="veil">
    <div v-if="updating" class="veil" aria-hidden="true" />
  </Transition>

  <Transition name="toast">
    <div
      v-if="(needRefresh && !patchNotes.awaitingUpdate && !inGame) || updating"
      class="toast"
      role="status"
      :aria-busy="updating"
    >
      <RefreshCw :size="16" class="icon" :class="{ spinning: updating }" />

      <span class="text">
        <strong>{{
          updating ? t('pwa.updating') : failed ? t('pwa.updateFailed') : t('pwa.updateTitle')
        }}</strong>

        <span v-if="match.isDuel && !updating" class="hint">{{ t('pwa.duelHint') }}</span>
      </span>

      <button
        v-if="!updating"
        :disabled="match.isDuel || updates.checking || updates.requesting"
        type="button"
        class="btn primary small"
        @click="updates.updateGame"
      >
        {{ t('pwa.update') }}
      </button>
    </div>
  </Transition>
</template>

<style scoped>
/*
 * Centred between the screen's edges: pinned at left: 50% instead, it could only grow to half the screen. Above every
 * dialog, and clickable under one: an open modal turns pointer events off on the body, and the toast inherits that.
 */
.toast {
  position: fixed;
  inset-inline: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  margin-inline: auto;
  padding: 8px 10px 8px 14px;
  border-radius: var(--radius);
  background: #0f1614;
  border: 1px solid rgba(244, 197, 91, 0.5);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  font-size: 13.5px;
  pointer-events: auto;
  z-index: 80;
}

.icon {
  flex: none;
  color: var(--gold);
}

.text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.hint {
  font-size: 12px;
  color: var(--chalk-dim);
}

.small {
  min-height: 32px;
  padding: 0 12px;
  font-size: 12.5px;
}

.veil {
  position: fixed;
  inset: 0;
  z-index: 79;
  pointer-events: auto;
  background: rgba(8, 12, 11, 0.6);
  backdrop-filter: blur(2px);
  cursor: progress;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

.veil-enter-active,
.veil-leave-active {
  transition: opacity 0.2s;
}

.veil-enter-from,
.veil-leave-to {
  opacity: 0;
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
  transform: translateY(8px);
}
</style>
