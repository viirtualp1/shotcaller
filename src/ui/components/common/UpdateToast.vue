<script setup lang="ts">
import { RefreshCw, X } from 'lucide-vue-next'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'

/** The game stays open for hours, so it asks the server for a new version now and then. */
const UPDATE_CHECK_MS = 60 * 60 * 1000

const match = useMatchStore()
const { t } = useGameText()

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, registration) {
    if (registration) {
      setInterval(() => void registration.update(), UPDATE_CHECK_MS)
    }
  },
})
</script>

<template>
  <Transition name="toast">
    <div v-if="needRefresh" class="toast" role="status">
      <RefreshCw :size="16" class="icon" />

      <span class="text">
        <strong>{{ t('pwa.updateTitle') }}</strong>
        <span v-if="match.isDuel" class="hint">{{ t('pwa.duelHint') }}</span>
      </span>

      <button type="button" class="btn primary small" @click="updateServiceWorker(true)">
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
  padding: 5px 12px;
  font-size: 12.5px;
}

.close {
  width: 28px;
  height: 28px;
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
