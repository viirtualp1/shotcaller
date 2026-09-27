<script setup lang="ts">
import type { ItemOfferView } from '@/application/views'
import { useGameText } from '../../composables/useGameText'
import ItemIcon from '../common/ItemIcon.vue'

defineProps<{ offer: ItemOfferView; disabled: boolean; index: number }>()
defineEmits<{ buy: [itemId: ItemOfferView['itemId']] }>()
const text = useGameText()
</script>

<template>
  <button
    type="button"
    class="offer anim-slide"
    :class="{ poor: !offer.affordable }"
    :style="{ '--i': index }"
    :disabled="disabled"
    @click="$emit('buy', offer.itemId)"
  >
    <ItemIcon :item-id="offer.itemId" :size="32" />
    <span class="info">
      <span class="name">{{ text.itemName(offer.itemId) }}</span>
      <span class="desc">{{ text.itemDescription(offer.itemId) }}</span>
    </span>
    <span class="cost"><span class="coin" /> {{ offer.cost }}</span>
  </button>
</template>

<style scoped>
.offer {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid var(--edge);
  background: var(--panel-raised);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.12s,
    border-color 0.15s;
}

.offer:hover:not(:disabled) {
  transform: translateX(-3px);
  border-color: rgba(244, 197, 91, 0.5);
}

.offer:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.offer.poor {
  opacity: 0.55;
}

.info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 700;
  font-size: 13px;
}

.desc {
  font-size: 11px;
  color: var(--chalk-dim);
}

.cost {
  font-weight: 700;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
