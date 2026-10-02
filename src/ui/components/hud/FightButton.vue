<script setup lang="ts">
import { Flag, LoaderCircle, Swords, Undo2 } from '@lucide/vue'
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
        :class="{ cancellable: duel.canWithdraw }"
        :aria-label="
          t(duel.reconnecting ? 'duel.reconnecting' : duel.canWithdraw ? 'duel.withdraw' : 'duel.waiting')
        "
        :title="duel.canWithdraw ? t('duel.withdrawHint') : undefined"
        aria-busy="true"
        :disabled="!duel.canWithdraw"
        @click="duel.withdraw()"
      >
        <LoaderCircle :size="18" class="spin" />

        <span v-if="!duel.reconnecting" class="waiting-text">
          {{ t('duel.waiting') }}
          <small v-if="duel.canWithdraw"><Undo2 :size="12" /> {{ t('duel.withdraw') }}</small>
        </span>
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

.waiting-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  line-height: 1.15;
}

.waiting-text small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 700;
  opacity: 0.75;
}

.waiting.cancellable:hover small {
  opacity: 1;
  text-decoration: underline;
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
