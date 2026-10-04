<script setup lang="ts">
import { Play } from '@lucide/vue'
import { computed } from 'vue'
import { MODES } from '@/content/modes'
import { useGameText } from '../../composables/useGameText'
import { useDuelStore } from '../../stores/duel'
import { useMatchStore } from '../../stores/match'
import BaseStatus from '../hud/BaseStatus.vue'

/** The match waiting for the coach: where it stands, and the button to carry on. */
const store = useMatchStore()
const duel = useDuelStore()
const { t } = useGameText()

const saved = computed(() => store.saved)

const label = computed(() => {
  const state = saved.value
  if (!state) {
    return ''
  }

  const against = state.trialId ? t(`career.trials.${state.trialId}.name`) : t('start.home.vsComputer')

  return `${t(`modes.${state.mode}.name`)} · ${against}`
})
</script>

<template>
  <section v-if="saved" class="resume">
    <div class="meta">
      <span>{{ label }}</span>
      <span>{{ t('hud.round', { round: saved.round, max: MODES[saved.mode].maxRounds }) }}</span>
    </div>

    <div class="score">
      <BaseStatus :team="0" :structures="saved.structures[0]" :mode="saved.mode" />
      <span class="vs">vs</span>
      <BaseStatus :team="1" :structures="saved.structures[1]" :mode="saved.mode" />
    </div>

    <button
      type="button"
      class="btn primary block big"
      :disabled="duel.matchmaking"
      @click="store.continueMatch()"
    >
      <Play :size="18" /> {{ t('start.home.continue') }}
    </button>
  </section>
</template>

<style scoped>
.resume {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(244, 197, 91, 0.45);
  border-radius: var(--radius);
  background: rgba(244, 197, 91, 0.06);
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--chalk-dim);
}

.meta span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta span:last-child {
  flex: none;
}

.score {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.score :deep(.who) {
  display: none;
}

.vs {
  font-size: 11px;
  color: var(--chalk-faint);
}
</style>
