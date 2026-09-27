<script setup lang="ts">
import { Swords, Wand2 } from 'lucide-vue-next'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { computed } from 'vue'
import type { ShopOfferView } from '@/application/views'
import type { HeroId } from '@/content/ids'
import { useGameText } from '../../composables/useGameText'
import { useDragStore } from '../../stores/drag'
import { useMatchStore, type ShopTab } from '../../stores/match'
import HudPanel from '../common/HudPanel.vue'
import EconomyBar from './EconomyBar.vue'
import HeroOffer from './HeroOffer.vue'
import ItemOffer from './ItemOffer.vue'

const store = useMatchStore()
const drag = useDragStore()
const { t } = useGameText()
const human = computed(() => store.view!.human)
const locked = computed(() => !store.isPlanning)
const selling = computed(() => drag.active)
const sellHovered = computed(() => drag.target?.kind === 'sell')

const tab = computed({
  get: () => store.shopTab,
  set: (value: ShopTab) => (store.shopTab = value),
})

const heroOffers = computed(() =>
  human.value.shop.filter((o): o is ShopOfferView & { heroId: HeroId } => o.heroId !== null),
)

const soldCount = computed(() => human.value.shop.length - heroOffers.value.length)
</script>

<template>
  <HudPanel class="shop" data-drop="sell">
    <EconomyBar />

    <TabsRoot v-model="tab" class="tabs">
      <TabsList class="tab-list" :aria-label="t('shop.heroes')">
        <TabsTrigger value="heroes" class="tab" data-tour="shop-heroes">
          <Swords :size="14" /> {{ t('shop.heroes') }}
        </TabsTrigger>

        <TabsTrigger value="items" class="tab" data-tour="shop-items">
          <Wand2 :size="14" /> {{ t('shop.items') }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="heroes" class="list" data-tour="shop">
        <div :key="store.rerolls" class="offers">
          <HeroOffer
            v-for="(offer, i) in heroOffers"
            :key="`${offer.slot}-${offer.heroId}`"
            :offer="offer"
            :index="i"
            :disabled="locked"
            @buy="store.buy"
          />

          <div v-for="n in soldCount" :key="`sold-${n}`" class="sold" aria-hidden="true" />
        </div>
      </TabsContent>

      <TabsContent value="items" class="list">
        <div class="offers">
          <ItemOffer
            v-for="(offer, i) in human.itemShop"
            :key="offer.itemId"
            :offer="offer"
            :index="i"
            :disabled="locked"
            @buy="store.buyItem"
          />
        </div>
      </TabsContent>
    </TabsRoot>

    <Transition name="fade">
      <div v-if="selling" class="sell-zone" :class="{ hovered: sellHovered }">{{ t('shop.sellZone') }}</div>
    </Transition>
  </HudPanel>
</template>

<style scoped>
.shop {
  position: relative;
  gap: 10px;
}

.tabs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.tab-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
}

.tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--chalk-dim);
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.tab[data-state='active'] {
  background: var(--panel-raised);
  color: var(--chalk);
  box-shadow: inset 0 0 0 1px var(--edge-strong);
}

.list {
  min-height: 0;
  overflow-y: auto;
}

.offers {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sold {
  height: 54px;
  border-radius: 10px;
  border: 1px dashed var(--edge);
}

.sell-zone {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 2px dashed rgba(255, 112, 96, 0.6);
  background: rgba(40, 14, 12, 0.82);
  color: var(--theirs);
  font-family: var(--font-hand);
  font-size: 30px;
  pointer-events: none;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.sell-zone.hovered {
  border-color: var(--theirs);
  background: rgba(70, 20, 16, 0.92);
}
</style>
