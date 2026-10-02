<script setup lang="ts">
import { computed } from 'vue'
import type { ItemId } from '@/content/ids'
import { ITEMS } from '@/content/items'
import { useGameText } from '../../composables/useGameText'
import ItemIcon from './ItemIcon.vue'

/** Dota-style item tooltip: name and cost up top, then what the item does. */
const props = withDefaults(defineProps<{ itemId: ItemId; hint?: string; heading?: boolean }>(), {
  hint: undefined,
  heading: true,
})

const text = useGameText()
const { t } = text
const item = computed(() => ITEMS[props.itemId])
const passive = computed(() => Object.keys(item.value.effects).length > 0)
</script>

<template>
  <div class="item-details">
    <header v-if="heading" class="head">
      <ItemIcon :item-id="itemId" :size="42" />

      <span class="title">
        <strong class="name">{{ item.name }}</strong>
        <span class="cost"><span class="coin" /> {{ item.cost }}</span>
      </span>
    </header>

    <section class="block" :class="{ passive }">
      <span class="label">{{ passive ? t('itemTip.passive') : t('itemTip.bonus') }}</span>
      <p class="text">{{ text.itemDescription(itemId) }}</p>
    </section>

    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.item-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 250px;
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--edge);
}

.title {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.name {
  font-size: 14px;
}

.cost {
  font-weight: 700;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 9px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.04);
  border-left: 2px solid var(--heal);
}

.block.passive {
  border-left-color: var(--gold);
}

.label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.text {
  margin: 0;
  color: var(--chalk);
}

.hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--chalk-faint);
}
</style>
