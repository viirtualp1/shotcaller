<script setup lang="ts">
import { RefreshCw, X } from 'lucide-vue-next'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { ref } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'

/** The game stays open for hours, so it asks the server for a new version often; the request is tiny. */
const UPDATE_CHECK_MS = 60 * 1000

const match = useMatchStore()
const { t } = useGameText()
const updating = ref(false)
let registration: ServiceWorkerRegistration | undefined

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, registered) {
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

    setInterval(check, UPDATE_CHECK_MS)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
  },
})

/**
 * The plugin reloads only a tab that the old worker controlled; a tab opened with a hard reload
 * is not controlled, so it would sit on the old version. Reloading once the new worker is active covers both.
 */
async function applyUpdate() {
  updating.value = true
  const waiting = registration?.waiting
  if (!waiting) {
    window.location.reload()

    return
  }

  const reload = () => window.location.reload()
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true })

  waiting.addEventListener('statechange', () => {
    if (waiting.state === 'activated') {
      reload()
    }
  })

  await updateServiceWorker()
}
</script>

<template>
  <Transition name="toast">
    <div v-if="needRefresh" class="toast" role="status">
      <RefreshCw :size="16" class="icon" />

      <span class="text">
        <strong>{{ t('pwa.updateTitle') }}</strong>
        <span v-if="match.isDuel" class="hint">{{ t('pwa.duelHint') }}</span>
      </span>

      <button type="button" class="btn primary small" :disabled="updating" @click="applyUpdate">
        {{ t('pwa.update') }}
      </button>

      <button type="button" class="icon-btn close" :aria-label="t('pwa.later')" @click="needRefresh = false">
        <X :size="14" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  translate: -50% 0;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: calc(100vw - 32px);
  padding: 8px 10px 8px 14px;
  border-radius: 12px;
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

.close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
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
