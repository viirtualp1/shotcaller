<script setup lang="ts">
import { computed } from 'vue'
import type { ItemOfferView } from '@/application/views'
import { upgradeOf } from '@/content/items'
import { useGameText } from '../../composables/useGameText'
import InfoTooltip from '../common/InfoTooltip.vue'
import ItemDetails from '../common/ItemDetails.vue'
import ItemIcon from '../common/ItemIcon.vue'

const props = defineProps<{ offer: ItemOfferView; disabled: boolean; index: number }>()

defineEmits<{ buy: [itemId: ItemOfferView['itemId']] }>()

const text = useGameText()
const { t } = text
const unavailable = computed(() => !props.offer.affordable || !props.offer.fits)
const upgrade = computed(() => upgradeOf(props.offer.itemId))
</script>

<template>
  <InfoTooltip side="left">
    <button
      type="button"
      class="offer anim-slide"
      :class="{ unavailable, forges: offer.forge === 'buy' && !unavailable }"
      :style="{ '--i': index }"
      :disabled="disabled"
      :aria-disabled="unavailable"
      @click="!unavailable && $emit('buy', offer.itemId)"
    >
      <ItemIcon :item-id="offer.itemId" :size="32" />

      <span class="info">
        <span class="name">{{ text.itemName(offer.itemId) }}</span>

        <span v-if="offer.recipes.length" class="recipe">{{
          t('recipes.completes', { name: text.itemName(offer.recipes[0]!) })
        }}</span>

        <span class="desc">{{ text.itemDescription(offer.itemId) }}</span>
      </span>

      <span class="side">
        <span class="cost"><span class="coin" /> {{ offer.cost }}</span>
        <span v-if="offer.forge === 'buy'" class="badge up">{{ t('shop.forgeBuy') }}</span>
        <span v-else-if="offer.forge === 'equip'" class="badge pair">{{ t('shop.forgeEquip') }}</span>

        <span v-else-if="offer.ownedCopies" class="badge">{{
          t('shop.owned', { n: offer.ownedCopies })
        }}</span>
      </span>
    </button>

    <template #content>
      <div class="forge-tip">
        <span class="label">{{ t('shop.forgesInto') }}</span>
        <ItemDetails :item-id="upgrade" />

        <p v-if="offer.forge" class="note">
          {{ t(offer.forge === 'buy' ? 'shop.forgeBuyTip' : 'shop.forgeEquipTip') }}
        </p>
      </div>
    </template>
  </InfoTooltip>
</template>

<style scoped>
.recipe {
  font-size: 11px;
  color: var(--gold);
}
.offer {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border-radius: var(--radius);
  border: 1px solid var(--edge);
  background: var(--panel-raised);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.12s,
    border-color 0.15s,
    box-shadow 0.15s;
}

.offer:hover:not(:disabled, .unavailable) {
  transform: translateX(-3px);
  border-color: rgba(244, 197, 91, 0.5);
}

.offer:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.offer.unavailable {
  cursor: not-allowed;
  filter: grayscale(1);
  opacity: 0.45;
}

.offer.forges {
  border-color: var(--gold);
  animation: glow 1.6s ease-in-out infinite;
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
  white-space: pre-line;
}

.side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.cost {
  font-weight: 700;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.badge {
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  color: var(--chalk-dim);
  border: 1px solid var(--edge-strong);
  white-space: nowrap;
}

.badge.up {
  color: var(--ink);
  background: var(--gold);
  border-color: var(--gold);
  font-weight: 700;
}

.badge.pair {
  color: var(--gold);
  border-color: rgba(244, 197, 91, 0.6);
  font-weight: 700;
}

.forge-tip {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
}

.note {
  margin: 0;
  max-width: 260px;
  font-size: 12px;
  color: var(--chalk-dim);
}

@keyframes glow {
  50% {
    box-shadow: 0 0 16px rgba(244, 197, 91, 0.45);
  }
}
</style>
