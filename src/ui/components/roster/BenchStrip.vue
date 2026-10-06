<script setup lang="ts">
import { computed } from 'vue'
import type { HeroCardView } from '@/application/views'
import { useGameText } from '../../composables/useGameText'
import { useDragStore } from '../../stores/drag'
import { useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'
import HudPanel from '../common/HudPanel.vue'

/**
 * The heroes waiting on the bench, above the shop on a phone: a hero just bought goes onto the map with a drag, or a
 * tap and then a lane, without leaving the shop.
 */
const store = useMatchStore()
const drag = useDragStore()
const { t, heroName } = useGameText()
const human = computed(() => store.view!.human)
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
</script>

<template>
  <HudPanel
    class="strip"
    :title="t('bench.title')"
    :meta="t('bench.onBoard', { count: human.boardCount, capacity: human.boardCapacity })"
  >
    <div class="row" :class="{ hovered }" data-drop="bench">
      <button
        v-for="hero in human.bench"
        :key="hero.uid"
        type="button"
        class="slot anim-pop"
        :class="{ selected: store.selectedUid === hero.uid }"
        :aria-label="heroName(hero.heroId)"
        @pointerdown="press(hero, $event)"
        @keydown.enter="store.select(hero.uid)"
      >
        <HeroAvatar :hero-id="hero.heroId" :stars="hero.stars" :pending="hero.pendingTalent" fill />
      </button>
    </div>
  </HudPanel>
</template>

<style scoped>
.strip {
  padding-block: 8px 10px;
}

/* Wraps rather than scrolls: a finger on a hero lifts it, so the row could not be swiped. */
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border-radius: var(--radius);
}

.row.hovered {
  box-shadow: inset 0 0 0 1px var(--gold);
  background: rgba(244, 197, 91, 0.08);
}

.slot {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  aspect-ratio: 1;
  padding: 0;
  border: 1px dashed var(--edge);
  border-radius: var(--radius);
  background: transparent;
  container-type: inline-size;
  cursor: grab;
  touch-action: none;
}

.slot.selected {
  border-style: solid;
  border-color: var(--gold);
  box-shadow: 0 0 0 1px var(--gold);
}
</style>
