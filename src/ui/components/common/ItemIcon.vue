<script setup lang="ts">
import type { ItemId } from '@/content/ids'
import { ITEM_ICONS } from '../../icons'

/** `fill` stretches the icon over its container, for grid slots whose size depends on the layout. */
withDefaults(defineProps<{ itemId: ItemId; size?: number; fill?: boolean }>(), { size: 34 })
</script>

<template>
  <span class="item" :class="{ fill }" :style="{ '--size': `${size}px` }" aria-hidden="true">
    <component :is="ITEM_ICONS[itemId]" :size="Math.round(size * 0.56)" :stroke-width="2.2" />
  </span>
</template>

<style scoped>
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

.item.fill {
  width: 100%;
  height: 100%;
}

.item.fill > svg {
  width: 56%;
  height: 56%;
}
</style>
