<script setup lang="ts">
import type { ItemId } from '@/content/ids'
import ItemIcon from '../common/ItemIcon.vue'

/** A hero's name on a stats bar, with the items that tell it from its twin when both share a lane. */
withDefaults(defineProps<{ name: string; items: readonly ItemId[]; itemSize?: number }>(), { itemSize: 22 })
</script>

<template>
  <span class="fighter">
    <span class="name">{{ name }}</span>

    <span v-if="items.length" class="items">
      <ItemIcon v-for="(id, i) in items" :key="i" :item-id="id" :size="itemSize" />
    </span>
  </span>
</template>

<style scoped>
.fighter {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.items {
  display: flex;
  flex: none;
  gap: 3px;
}
</style>
