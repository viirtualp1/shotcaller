<script setup lang="ts">
import { computed } from 'vue'
import type { StashItemView } from '@/application/views'
import { useGameText } from '../../composables/useGameText'
import { useDragStore } from '../../stores/drag'
import { useMatchStore } from '../../stores/match'
import HudPanel from '../common/HudPanel.vue'
import InfoTooltip from '../common/InfoTooltip.vue'
import ItemDetails from '../common/ItemDetails.vue'
import ItemIcon from '../common/ItemIcon.vue'

const store = useMatchStore()
const drag = useDragStore()
const text = useGameText()
const { t } = text
const human = computed(() => store.view!.human)
const empties = computed(() => Math.max(0, human.value.stashSize - human.value.stash.length))

function press(item: StashItemView, e: PointerEvent) {
  if (e.button !== 0) {
    return
  }

  drag.press(
    {
      kind: 'item',
      index: item.index,
      itemId: item.itemId,
    },
    e.clientX,
    e.clientY,
  )
}
</script>

<template>
  <HudPanel :title="t('stash.title')" :meta="human.stash.length ? t('stash.hint') : ''" data-tour="stash">
    <div class="grid">
      <InfoTooltip
        v-for="item in human.stash"
        :key="`${item.itemId}-${item.index}`"
        side="right"
        :disabled="drag.active"
      >
        <button
          type="button"
          class="slot anim-pop"
          :class="{ selected: store.selectedItem === item.index }"
          @pointerdown="press(item, $event)"
          @keydown.enter="store.selectItem(item.index)"
        >
          <ItemIcon :item-id="item.itemId" :size="34" />
        </button>

        <template #content>
          <ItemDetails :item-id="item.itemId" />
        </template>
      </InfoTooltip>

      <span v-for="n in empties" :key="`empty-${n}`" class="slot empty" aria-hidden="true" />
    </div>
  </HudPanel>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.slot {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  padding: 0;
  cursor: grab;
  touch-action: none;
  transition: transform 0.12s;
}

.slot:hover {
  transform: translateY(-2px);
}

.slot.selected {
  border-color: var(--gold);
  box-shadow: 0 0 0 1px var(--gold);
}

.slot.empty {
  border: 1px dashed var(--edge);
  pointer-events: none;
}
</style>
