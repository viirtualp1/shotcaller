<script setup lang="ts">
import { Wand2 } from '@lucide/vue'
import { computed } from 'vue'
import type { HeroCardView } from '@/application/views'
import { useGameText } from '../../composables/useGameText'
import { useDragStore } from '../../stores/drag'
import { useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'
import HudPanel from '../common/HudPanel.vue'
import HeroTooltipCard from './HeroTooltipCard.vue'
import InfoTooltip from '../common/InfoTooltip.vue'

/** `dense`: small fixed-size slots, so a touch screen fits the whole grid without scrolling. */
withDefaults(defineProps<{ dense?: boolean }>(), { dense: false })

const store = useMatchStore()
const drag = useDragStore()
const { t } = useGameText()
const human = computed(() => store.view!.human)

const canArrange = computed(
  () =>
    store.isPlanning && human.value.bench.length > 0 && human.value.boardCount < human.value.boardCapacity,
)

const empties = computed(() => Math.max(0, human.value.benchSize - human.value.bench.length))
const dropping = computed(() => drag.active && drag.payload?.kind === 'hero')
const hovered = computed(() => drag.target?.kind === 'bench')

function press(hero: HeroCardView, e: PointerEvent) {
  if (e.button !== 0) {
    return
  }

  drag.press(
    {
      kind: 'hero',
      uid: hero.uid,
      heroId: hero.heroId,
      stars: hero.stars,
    },
    e.clientX,
    e.clientY,
  )
}

function onPanelClick() {
  if (store.selected && store.selected.slot !== 'bench') {
    store.placeSelected('bench')
  }
}
</script>

<template>
  <HudPanel
    :title="t('bench.title')"
    :meta="t('bench.onBoard', { count: human.boardCount, capacity: human.boardCapacity })"
    data-tour="bench"
  >
    <!-- The button sits in the header, so the bench spends no row on it. A phone's dock keeps its label. -->
    <template #actions>
      <button
        type="button"
        class="btn small auto"
        :class="{ icon: !dense }"
        :disabled="!canArrange"
        :aria-label="t('shop.autoArrange')"
        :title="t('shop.autoArrange')"
        data-tour="auto-place"
        @click="store.autoArrange()"
      >
        <Wand2 :size="14" />
        <template v-if="dense">{{ t('shop.autoArrange') }}</template>
      </button>
    </template>

    <div class="grid" :class="{ dropping, hovered, dense }" data-drop="bench" @click.self="onPanelClick">
      <InfoTooltip v-for="hero in human.bench" :key="hero.uid" side="right" :disabled="drag.active">
        <button
          type="button"
          class="slot filled anim-pop"
          :class="{
            selected: store.selectedUid === hero.uid,
            itemTarget: drag.target?.kind === 'hero' && drag.target.uid === hero.uid,
          }"
          :data-drop="`hero:${hero.uid}`"
          @pointerdown="press(hero, $event)"
          @keydown.enter="store.select(hero.uid)"
        >
          <HeroAvatar :hero-id="hero.heroId" :stars="hero.stars" :pending="hero.pendingTalent" fill />

          <span v-if="hero.items.length" class="pips">
            <i v-for="(item, i) in hero.items" :key="`${item}-${i}`" />
          </span>
        </button>

        <template #content>
          <HeroTooltipCard
            :hero-id="hero.heroId"
            :stars="hero.stars"
            :items="hero.items"
            :souls="hero.souls"
            :talent="hero.talent"
          />
        </template>
      </InfoTooltip>

      <span v-for="n in empties" :key="`empty-${n}`" class="slot empty" aria-hidden="true" />
    </div>
  </HudPanel>
</template>

<style scoped>
/* Same cell size, gap and inset as the stash, so the two grids line up. */
.grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  border-radius: var(--radius);
  transition: background 0.15s;
}

.grid.dense {
  grid-template-columns: repeat(auto-fill, 44px);
  justify-content: center;
}

.small {
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.small.icon {
  width: 30px;
  min-height: 26px;
  padding: 0;
}

.grid.dropping {
  box-shadow: inset 0 0 0 1px rgba(244, 197, 91, 0.4);
}

.grid.hovered {
  box-shadow: inset 0 0 0 1px var(--gold);
  background: rgba(244, 197, 91, 0.08);
}

.slot {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: var(--radius);
  container-type: inline-size;
}

.slot.empty {
  border: 1px dashed var(--edge);
  pointer-events: none;
}

.slot.filled {
  border: 1px dashed var(--edge);
  background: transparent;
  cursor: grab;
  touch-action: none;
  padding: 0;
  transition:
    transform 0.12s,
    border-color 0.15s;
}

.slot.filled:hover {
  transform: translateY(-2px);
  border-color: var(--edge-strong);
}

.slot.selected {
  border-style: solid;
  border-color: var(--gold);
  box-shadow: 0 0 0 1px var(--gold);
}

.slot.itemTarget {
  border-style: solid;
  border-color: var(--gold);
  background: rgba(244, 197, 91, 0.15);
  transform: scale(1.06);
}

.pips {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
}

.pips i {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: var(--gold);
}
</style>
