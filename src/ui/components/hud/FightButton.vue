<script setup lang="ts">
import { Flag, LoaderCircle, Swords } from '@lucide/vue'
import { useFightRequest } from '../../composables/useFightRequest'
import { useGameText } from '../../composables/useGameText'
import { useDuelStore } from '../../stores/duel'
import { useMatchStore } from '../../stores/match'

const store = useMatchStore()
const duel = useDuelStore()
const { t } = useGameText()
const fight = useFightRequest()
</script>

<template>
  <div class="fight-slot">
    <Transition name="fade" mode="out-in">
      <button
        v-if="duel.canClaim"
        key="claim"
        type="button"
        class="btn primary block fight"
        :title="t('duel.claimHint')"
        @click="duel.claim()"
      >
        <Flag :size="18" /> {{ t('duel.claim') }}
      </button>

      <button
        v-else-if="store.awaiting"
        key="waiting"
        type="button"
        class="btn primary block fight waiting"
        :aria-label="t(duel.reconnecting ? 'duel.reconnecting' : 'duel.waiting')"
        aria-busy="true"
        disabled
      >
        <LoaderCircle :size="18" class="spin" />
        <span v-if="!duel.reconnecting">{{ t('duel.waiting') }}</span>
      </button>

      <button
        v-else-if="store.phase !== 'battle'"
        key="fight"
        type="button"
        class="btn primary block fight"
        :disabled="!store.isPlanning"
        data-tour="fight"
        @click="fight()"
      >
        <Swords :size="18" /> {{ t('shop.fight') }}
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.fight-slot {
  display: flex;
  min-height: 52px;
}

.fight {
  min-height: 52px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.waiting {
  font-size: 15px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

.fight:not(:disabled) {
  animation: breathe 2.4s ease-in-out infinite;
}

@keyframes breathe {
  50% {
    box-shadow: 0 0 22px rgba(244, 197, 91, 0.45);
  }
}
</style>
