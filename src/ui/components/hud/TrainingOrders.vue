<script setup lang="ts">
import { Swords, Target } from '@lucide/vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import type { LaneId } from '@/content/ids'
import { MODES } from '@/content/modes'
import { sandboxGoal } from '@/content/sandbox'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'

const store = useMatchStore()
const text = useGameText()
const { t } = text

const settings = computed(() => store.view?.sandbox)
const lanes = computed(() => (store.view ? MODES[store.view.mode].lanes : []))

function setGoal(lane: LaneId, goal: unknown) {
  if (goal === 'dummies' || goal === 'push') {
    store.setSandboxGoal(lane, goal)
  }
}
</script>

<template>
  <section v-if="settings?.dummies" class="training-orders" :aria-label="t('sandbox.orders')">
    <div v-for="lane in lanes" :key="lane" class="lane">
      <span class="label">{{ t(`lanes.${lane}`) }}</span>

      <ToggleGroupRoot
        :model-value="sandboxGoal(settings, lane)"
        type="single"
        class="segmented-control"
        :aria-label="t('sandbox.target', { lane: t(`lanes.${lane}`) })"
        :disabled="!store.isPlanning && store.phase !== 'battle'"
        @update:model-value="setGoal(lane, $event)"
      >
        <ToggleGroupItem value="dummies" class="segmented-option">
          <Target :size="12" /> {{ t('sandbox.practice') }}
        </ToggleGroupItem>

        <ToggleGroupItem value="push" class="segmented-option">
          <Swords :size="12" /> {{ t('sandbox.push') }}
        </ToggleGroupItem>
      </ToggleGroupRoot>
    </div>
  </section>
</template>

<style scoped>
.training-orders {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lane {
  display: grid;
  grid-template-columns: 38px 1fr;
  align-items: center;
  gap: 6px;
}

.label {
  color: var(--chalk-dim);
  font-size: 11px;
  font-weight: 600;
}

.segmented-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 7px;
  font-size: 11px;
}
</style>
