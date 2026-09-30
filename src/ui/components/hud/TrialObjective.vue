<script setup lang="ts">
import { Target } from '@lucide/vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import InfoTooltip from '../common/InfoTooltip.vue'

const match = useMatchStore()
const { t } = useGameText()
</script>

<template>
  <InfoTooltip v-if="match.view?.trialId" side="bottom">
    <span class="objective" tabindex="0"
      ><Target :size="13" /> {{ t(`career.trials.${match.view.trialId}.name`) }}</span
    >

    <template #content
      ><strong>{{ t('career.tabs.trials') }}</strong>
      <p>{{ t(`career.trials.${match.view.trialId}.objective`) }}</p></template
    >
  </InfoTooltip>
</template>

<style scoped>
.objective {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 4px;
  padding: 3px 10px;
  border: 1px solid var(--edge);
  border-radius: 0 0 8px 8px;
  background: var(--panel);
  color: var(--gold);
  font-size: 12px;
  cursor: help;
}
p {
  margin: 4px 0 0;
  max-width: 32ch;
  color: var(--chalk-dim);
}
</style>
