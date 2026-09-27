<script setup lang="ts">
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useDragStore } from '../../stores/drag'
import { locateHero, useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'
import ItemIcon from '../common/ItemIcon.vue'

const drag = useDragStore()
const match = useMatchStore()
const text = useGameText()
const { t } = text

const hint = computed(() => {
  const target = drag.target
  if (!target) {
    return ''
  }

  switch (target.kind) {
    case 'lane':
      return text.slotName(target.lane)
    case 'bench':
      return t('bench.title')

    case 'sell': {
      const payload = drag.payload
      const human = match.view?.human
      if (payload?.kind === 'hero' && human) {
        const located = locateHero(human, payload.uid)
        if (located) {
          return t('card.sell', { gold: located.hero.sellValue })
        }
      }

      if (payload?.kind === 'item' && human) {
        const item = human.stash[payload.index]
        if (item) {
          return t('card.sell', { gold: item.sellValue })
        }
      }

      return t('shop.sellZone')
    }

    case 'hero': {
      const human = match.view?.human
      const located = human ? locateHero(human, target.uid) : null
      return located ? text.heroName(located.hero.heroId) : ''
    }
  }

  return ''
})
</script>

<template>
  <div
    v-if="drag.active && drag.payload"
    class="ghost"
    :class="{ onTarget: drag.target }"
    :style="{ transform: `translate(${drag.pointer.x}px, ${drag.pointer.y}px)` }"
    aria-hidden="true"
  >
    <HeroAvatar
      v-if="drag.payload.kind === 'hero'"
      :hero-id="drag.payload.heroId"
      :stars="drag.payload.stars"
      :size="40"
    />

    <ItemIcon v-else :item-id="drag.payload.itemId" :size="38" />
    <span v-if="hint" class="hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.ghost {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -20px 0 0 -20px;
  pointer-events: none;
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.55));
  transition: filter 0.15s;
}

.ghost > :first-child {
  transition: transform 0.15s;
}

.ghost.onTarget > :first-child {
  transform: scale(1.12);
}

.hint {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-weight: 700;
  font-size: 12px;
  white-space: nowrap;
}
</style>
