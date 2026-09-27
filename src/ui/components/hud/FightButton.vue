<script setup lang="ts">
import { Swords } from 'lucide-vue-next'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'

const store = useMatchStore()
const { t } = useGameText()
</script>

<template>
  <div class="fight-slot">
    <Transition name="fade">
      <button
        v-if="store.phase !== 'battle'"
        type="button"
        class="btn primary block fight"
        :disabled="!store.isPlanning"
        data-tour="fight"
        @click="store.startBattle()"
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

.fight:not(:disabled) {
  animation: breathe 2.4s ease-in-out infinite;
}

@keyframes breathe {
  50% {
    box-shadow: 0 0 22px rgba(244, 197, 91, 0.45);
  }
}
</style>
