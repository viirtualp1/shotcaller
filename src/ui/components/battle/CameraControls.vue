<script setup lang="ts">
import { Focus } from '@lucide/vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import type { LaneId } from '@/content/ids'
import { MODES } from '@/content/modes'
import { useGameText } from '../../composables/useGameText'
import { useBoardStore } from '../../stores/board'
import { useMatchStore } from '../../stores/match'

const WHOLE_MAP = 'all'

const store = useMatchStore()
const board = useBoardStore()
const { t } = useGameText()

const lanes = computed<readonly LaneId[]>(() => (store.view ? MODES[store.view.mode].lanes : []))

/**
 * A view zoomed by hand has no option picked, so the whole map can be picked to go back. Picking the chosen option
 * again keeps it.
 */
const model = computed({
  get: () => board.follow ?? (board.zoomed ? '' : WHOLE_MAP),
  set: (value: string | undefined) => {
    if (value) {
      board.followLane(value === WHOLE_MAP ? null : (value as LaneId))
    }
  },
})
</script>

<template>
  <div class="camera">
    <Focus :size="16" class="icon" aria-hidden="true" />

    <ToggleGroupRoot v-model="model" type="single" class="views" :aria-label="t('camera.label')">
      <ToggleGroupItem :value="WHOLE_MAP" class="view">{{ t('camera.wholeMap') }}</ToggleGroupItem>

      <ToggleGroupItem
        v-for="lane in lanes"
        :key="lane"
        :value="lane"
        class="view"
        :aria-label="t('camera.follow', { lane: t(`lanes.${lane}`) })"
      >
        {{ t(`lanes.${lane}`) }}
      </ToggleGroupItem>
    </ToggleGroupRoot>
  </div>
</template>

<style scoped>
.camera {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  flex: none;
  color: var(--chalk-dim);
}

.views {
  display: flex;
  flex: 1;
  gap: 2px;
  padding: 2px;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.25);
}

.view {
  flex: 1;
  min-height: 34px;
  padding: 5px 8px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.view[data-state='on'] {
  background: var(--gold);
  color: var(--ink);
}
</style>
