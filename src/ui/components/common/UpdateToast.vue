<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { RefreshCw } from '@lucide/vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { computed, onScopeDispose } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { usePwaUpdate } from '../../composables/usePwaUpdate'
import { useLeaderboardStore } from '../../stores/leaderboard'
import { useLegalStore } from '../../stores/legal'
import { useMatchStore } from '../../stores/match'
import { usePatchNotesStore } from '../../stores/patchNotes'

/** The game stays open for hours, so it asks the server for a new version often; the request is tiny. */
const UPDATE_CHECK_MS = 60 * 1000
let registration: ServiceWorkerRegistration | undefined
let stopChecking: (() => void) | undefined

const match = useMatchStore()
const patchNotes = usePatchNotesStore()
const leaderboard = useLeaderboardStore()
const legal = useLegalStore()
const { t } = useGameText()

/* The game screen is up, as App picks it: the offer waits for the menu instead of covering the match. */
const inGame = computed(
  () => match.view !== null && !legal.document && !patchNotes.patch && !leaderboard.isOpen,
)

const { updating, failed, applyUpdate, reloadIfUpdating } = usePwaUpdate({
  registration: () => registration,
  workers: navigator.serviceWorker,
  reload: () => {
    needRefresh.value = false
    window.location.reload()
  },
})

const { needRefresh } = useRegisterSW({
  onNeedReload: reloadIfUpdating,
  onRegisteredSW(_url, registered) {
    stopChecking?.()
    registration = registered

    if (!registered) {
      return
    }

    /* A hidden tab waits: coming back checks at once, so nothing is missed. */
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && !registered.installing) {
        void registered.update().catch(() => undefined)
      }
    }

    const timer = setInterval(check, UPDATE_CHECK_MS)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)

    stopChecking = () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
    }
  },
})

/* While the new version installs, the game is frozen: no clicks reach it (the veil takes them) and no hotkeys. */
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

onScopeDispose(() => {
  stopChecking?.()
})
</script>

<template>
  <Transition name="veil">
    <div v-if="updating" class="veil" aria-hidden="true" />
  </Transition>

  <Transition name="toast">
    <div v-if="needRefresh && (!inGame || updating)" class="toast" role="status" :aria-busy="updating">
      <RefreshCw :size="16" class="icon" :class="{ spinning: updating }" />

      <span class="text">
        <strong>{{
          updating ? t('pwa.updating') : failed ? t('pwa.updateFailed') : t('pwa.updateTitle')
        }}</strong>

        <span v-if="match.isDuel && !updating" class="hint">{{ t('pwa.duelHint') }}</span>
      </span>

      <button v-if="!updating" type="button" class="btn primary small" @click="applyUpdate">
        {{ t('pwa.update') }}
      </button>
    </div>
  </Transition>
</template>

<style scoped>
/* Centred between the screen's edges: pinned at left: 50% instead, it could only grow to half the screen. */
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
  z-index: 70;
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
  z-index: 69;
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
