<script setup lang="ts">
import { computed } from 'vue'
import type { ItemId } from '@/content/ids'
import { baseItemOf, isUpgraded, recipeFor } from '@/content/items'
import { ITEM_ICONS } from '../../icons'

/** `fill` stretches the icon over its container, for grid slots whose size depends on the layout. */
const props = withDefaults(defineProps<{ itemId: ItemId; size?: number; fill?: boolean }>(), { size: 34 })

const parts = computed(() => {
  const recipe = recipeFor(props.itemId)
  return recipe ? [recipe.a, recipe.b] : [baseItemOf(props.itemId) as keyof typeof ITEM_ICONS]
})
</script>

<template>
  <span
    class="item"
    :class="{ fill, upgraded: isUpgraded(itemId) }"
    :style="{ '--size': `${size}px` }"
    aria-hidden="true"
  >
    <span class="parts" :class="{ pair: parts.length === 2 }"
      ><component
        :is="ITEM_ICONS[part]"
        v-for="part in parts"
        :key="part"
        :size="Math.round(size * (parts.length === 2 ? 0.36 : 0.56))"
        :stroke-width="2.2"
    /></span>

    <span v-if="isUpgraded(itemId)" class="plus">+</span>
  </span>
</template>

<style scoped>
.parts {
  display: flex;
  align-items: center;
}
.parts.pair {
  transform: rotate(-15deg);
}
.item {
  display: inline-grid;
  place-items: center;
  width: var(--size);
  height: var(--size);
  flex: none;
  border-radius: var(--radius);
  background: linear-gradient(160deg, #3a3222, #231d13);
  border: 1px solid rgba(244, 197, 91, 0.55);
  color: var(--gold);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

/* Two copies merged: a brighter frame, a warm glow and a plus in the corner. */
.item.upgraded {
  position: relative;
  border-color: var(--gold);
  background: linear-gradient(160deg, #5a4622, #2c2213);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 0 10px rgba(244, 197, 91, 0.35);
}

.plus {
  position: absolute;
  top: -5px;
  right: -5px;
  display: grid;
  place-items: center;
  width: max(14px, calc(var(--size) * 0.36));
  height: max(14px, calc(var(--size) * 0.36));
  border-radius: 50%;
  background: var(--gold);
  color: var(--ink);
  font-size: max(11px, calc(var(--size) * 0.3));
  font-weight: 800;
  line-height: 1;
}

.item.fill {
  width: 100%;
  height: 100%;
}

.item.fill .parts {
  width: 56%;
  height: 56%;
}

.item.fill .parts svg {
  width: 100%;
  height: 100%;
}
</style>
