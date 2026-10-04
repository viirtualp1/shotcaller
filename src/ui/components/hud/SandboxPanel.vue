<script setup lang="ts">
import { RotateCcw, Target } from '@lucide/vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import CheckField from '../common/CheckField.vue'
import HudPanel from '../common/HudPanel.vue'
import TrainingOrders from './TrainingOrders.vue'

/** The training ground: the clock and a fresh start, then dummies, then creep waves. */
const store = useMatchStore()
const { t } = useGameText()

const settings = computed(() => store.view?.sandbox ?? null)
const locked = computed(() => !store.isPlanning)
const dummiesOn = computed(() => (settings.value?.dummies ?? 0) > 0)

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

function toggleDummies() {
  const current = settings.value

  if (!current) {
    return
  }

  store.setSandbox({
    ...current,
    dummies: current.dummies > 0 ? 0 : 1,
  })
}
</script>

<template>
  <HudPanel v-if="settings" :title="t('sandbox.title')" class="sandbox">
    <template #actions>
      <button
        type="button"
        class="btn ghost reset"
        :title="t('sandbox.resetHint')"
        :disabled="locked"
        @click="store.resetSandbox()"
      >
        <RotateCcw :size="14" /> {{ t('sandbox.reset') }}
      </button>
    </template>

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

    <button
      type="button"
      class="dummies"
      :aria-pressed="dummiesOn"
      :title="t('sandbox.dummies')"
      :disabled="locked"
      @click="toggleDummies"
    >
      <Target :size="14" /> {{ t('sandbox.practice') }}
    </button>

    <TrainingOrders />

    <CheckField v-model="creeps" :class="{ locked }">{{ t('sandbox.creeps') }}</CheckField>
  </HudPanel>
</template>

<style scoped>
.sandbox :deep(.head) {
  align-items: center;
}

.reset {
  margin-left: auto;
  min-height: 28px;
  padding: 4px 8px;
  font-size: 12px;
}

.dummies {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: transparent;
  color: var(--chalk-dim);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.dummies[aria-pressed='true'] {
  border-color: var(--gold);
  background: var(--gold);
  color: var(--ink);
}

.dummies:disabled {
  opacity: 0.6;
  cursor: default;
}

.locked {
  pointer-events: none;
  opacity: 0.6;
}
</style>
