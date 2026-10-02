<script setup lang="ts">
import { RotateCcw } from '@lucide/vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import CheckField from '../common/CheckField.vue'
import HudPanel from '../common/HudPanel.vue'
import TrainingOrders from './TrainingOrders.vue'

/** The training ground's controls: the clock, how many dummies stand on each lane, creep waves, and a fresh start. */
const store = useMatchStore()
const { t } = useGameText()

const settings = computed(() => store.view?.sandbox ?? null)
const locked = computed(() => !store.isPlanning)

const dummies = computed({
  get: () => (settings.value?.dummies ? 'on' : 'off'),
  set: (value: string | undefined) => {
    if (settings.value && value !== undefined) {
      store.setSandbox({
        ...settings.value,
        dummies: value === 'on' ? 1 : 0,
      })
    }
  },
})

const clock = computed({
  get: () => (settings.value?.endless ? 'endless' : 'rounds'),
  set: (value: string | undefined) => {
    if (settings.value && value) {
      store.setSandbox({
        ...settings.value,
        endless: value === 'endless',
      })
    }
  },
})

const creeps = computed({
  get: () => settings.value?.creeps ?? false,
  set: (value: boolean) => {
    if (settings.value) {
      store.setSandbox({
        ...settings.value,
        creeps: value,
      })
    }
  },
})
</script>

<template>
  <HudPanel v-if="settings" :title="t('sandbox.title')" class="sandbox">
    <ToggleGroupRoot
      v-model="clock"
      type="single"
      class="segmented-control"
      :aria-label="t('sandbox.clock')"
      :disabled="locked"
    >
      <ToggleGroupItem value="endless" class="segmented-option">{{ t('sandbox.endless') }}</ToggleGroupItem>
      <ToggleGroupItem value="rounds" class="segmented-option">{{ t('sandbox.rounds') }}</ToggleGroupItem>
    </ToggleGroupRoot>

    <div class="field">
      <span id="sandbox-dummies" class="label">{{ t('sandbox.dummies') }}</span>

      <ToggleGroupRoot
        v-model="dummies"
        type="single"
        class="segmented-control"
        aria-labelledby="sandbox-dummies"
        :disabled="locked"
      >
        <ToggleGroupItem value="off" class="segmented-option">{{ t('sandbox.off') }}</ToggleGroupItem>
        <ToggleGroupItem value="on" class="segmented-option">{{ t('sandbox.on') }}</ToggleGroupItem>
      </ToggleGroupRoot>
    </div>

    <CheckField v-model="creeps" :class="{ locked }">{{ t('sandbox.creeps') }}</CheckField>

    <TrainingOrders />

    <button
      type="button"
      class="btn ghost reset"
      :title="t('sandbox.resetHint')"
      :disabled="locked"
      @click="store.resetSandbox()"
    >
      <RotateCcw :size="15" /> {{ t('sandbox.reset') }}
    </button>
  </HudPanel>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.locked {
  pointer-events: none;
  opacity: 0.6;
}

.reset {
  align-self: flex-start;
}
</style>
