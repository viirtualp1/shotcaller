<script setup lang="ts">
import { ChartColumn } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import { useRoundReportStore } from '../../stores/roundReport'
import HudPanel from '../common/HudPanel.vue'
import HeroMeterList from './HeroMeterList.vue'
import MeterTabs from './MeterTabs.vue'
import type { MeterStat } from './meter'

defineProps<{ placeholder?: boolean }>()
const store = useMatchStore()
const roundReport = useRoundReportStore()
const { t } = useGameText()
const stat = ref<MeterStat>('damageDealt')
const summary = computed(() => (store.phase === 'planning' ? (store.view?.summary ?? null) : null))
</script>

<template>
  <p v-if="!summary && placeholder" class="empty">{{ t('summary.noRound') }}</p>

  <HudPanel v-else-if="summary" class="panel" :title="t('summary.lastRound', { round: summary.round })">
    <template #actions>
      <button
        type="button"
        class="report-button"
        :title="t('summary.openReport')"
        @click="roundReport.show()"
      >
        <ChartColumn :size="14" /> {{ t('summary.details') }}
      </button>
    </template>

    <MeterTabs v-model="stat" />
    <HeroMeterList :heroes="summary.heroes" :stat="stat" class="last-meter" />
  </HudPanel>
</template>

<style scoped>
.panel {
  flex: 0 1 auto;
  min-height: 0;
}
.last-meter {
  flex: 1 1 auto;
}
.report-button {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: 4px;
  margin-left: auto;
  padding: 3px 0;
  border: 0;
  background: none;
  color: var(--gold);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.report-button:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}
.empty {
  margin: 0;
  font-size: 13px;
  color: var(--chalk-faint);
}
</style>
