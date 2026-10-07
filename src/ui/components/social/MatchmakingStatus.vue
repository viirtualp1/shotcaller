<script setup lang="ts">
import { Ghost, LoaderCircle, X } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useDuelStore } from '../../stores/duel'

const duel = useDuelStore()
const { t } = useGameText()

const searchTime = computed(
  () => `${Math.floor(duel.searchSeconds / 60)}:${String(duel.searchSeconds % 60).padStart(2, '0')}`,
)

const status = computed(() => {
  if (duel.cancellingSearch) {
    return t('matchmaking.cancelling')
  }

  return t(duel.reconnecting ? 'matchmaking.reconnecting' : 'matchmaking.searching')
})
</script>

<template>
  <section
    v-if="duel.matchmaking && duel.searchMode"
    class="matchmaking"
    :aria-label="t('matchmaking.searching')"
  >
    <div class="search-row">
      <LoaderCircle :size="22" class="spin" />

      <div class="search-status">
        <strong role="status">{{ status }}</strong>
        <span>{{ t('matchmaking.rankedMode', { mode: t(`modes.${duel.searchMode}.name`) }) }}</span>
      </div>

      <time :aria-label="t('matchmaking.elapsed')" aria-live="off">{{ searchTime }}</time>

      <button
        type="button"
        class="cancel"
        :aria-label="t('matchmaking.cancel')"
        :title="t('matchmaking.cancel')"
        :disabled="duel.cancellingSearch"
        @click="duel.cancelSearch()"
      >
        <X :size="20" />
      </button>
    </div>

    <div
      v-if="(duel.canChooseGhost || duel.choosingGhost) && !duel.cancellingSearch"
      class="ghost-choice"
      aria-live="polite"
    >
      <span>{{ t('matchmaking.ghostOffer') }}</span>

      <button class="btn gold" type="button" :disabled="duel.choosingGhost" @click="duel.chooseGhost()">
        <Ghost :size="17" />
        {{ t(duel.choosingGhost ? 'matchmaking.ghostConnecting' : 'matchmaking.chooseGhost') }}
      </button>

      <small>{{
        t(duel.ghostUnavailable ? 'matchmaking.ghostUnavailable' : 'matchmaking.keepSearching')
      }}</small>
    </div>
  </section>
</template>

<style scoped>
.matchmaking {
  position: fixed;
  top: 0;
  left: 50%;
  translate: -50% 0;
  z-index: 100;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(400px, 100%);
  min-height: 72px;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 24px 12px;
  border: 1px solid var(--gold);
  border-top: 0;
  border-bottom-width: 3px;
  border-radius: 0 0 var(--radius) var(--radius);
  background: linear-gradient(110deg, #334037, var(--panel) 70%);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  color: var(--gold);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 18px;
}

.ghost-choice {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--edge-strong);
  font-size: 13px;
  text-align: center;
}

.ghost-choice small {
  color: var(--chalk-dim);
  font-size: 12px;
  line-height: 1.4;
}

.search-status {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  line-height: 1.3;
}

.search-status strong {
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-status span {
  overflow: hidden;
  color: var(--chalk-dim);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

time {
  flex: none;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.cancel {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: transparent;
  color: var(--chalk-dim);
  cursor: pointer;
}

.cancel:hover:not(:disabled) {
  border-color: var(--chalk);
  color: var(--chalk);
}

.cancel:disabled {
  opacity: 0.4;
  cursor: default;
}

.spin {
  flex: none;
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .matchmaking {
    padding-inline: 12px;
  }

  .search-row {
    gap: 12px;
  }

  .search-status strong {
    font-size: 14px;
  }

  time {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}
</style>
