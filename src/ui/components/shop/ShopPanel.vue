<script setup lang="ts">
import { Anvil, Swords, Wand2 } from '@lucide/vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { computed } from 'vue'
import type { ShopOfferView } from '@/application/views'
import { HERO_IDS, type HeroId } from '@/content/ids'
import { useGameText } from '../../composables/useGameText'
import { useHaptics } from '../../composables/useHaptics'
import { useDragStore } from '../../stores/drag'
import { useMatchStore, type ShopTab } from '../../stores/match'
import HudPanel from '../common/HudPanel.vue'
import EconomyBar from './EconomyBar.vue'
import HeroOffer from './HeroOffer.vue'
import ItemOffer from './ItemOffer.vue'

const store = useMatchStore()
const drag = useDragStore()
const { t } = useGameText()
const haptics = useHaptics()
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

/** The training ground offers every hero, for free, instead of five random cards. */
const training = computed(() => store.view?.sandbox !== null)

const catalog = computed(() =>
  human.value.catalog.filter((o): o is ShopOfferView & { heroId: HeroId } => o.heroId !== null),
)

function recruit(slot: number) {
  haptics.buzzIfAccepted('tap', () => store.recruit(HERO_IDS[slot]!))
}

/** A hero bought is felt as well as seen. */
function buy(slot: number) {
  haptics.buzzIfAccepted('tap', () => store.buy(slot))
}
</script>

<template>
  <HudPanel class="shop" :class="{ training }" data-drop="sell">
    <EconomyBar v-if="!training" class="economy" />

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
        <div v-if="training" class="offers">
          <HeroOffer
            v-for="(offer, i) in catalog"
            :key="offer.heroId"
            :offer="offer"
            :index="i"
            :disabled="locked"
            free
            @buy="recruit"
          />
        </div>

        <div v-else :key="store.rerolls" class="offers">
          <HeroOffer
            v-for="(offer, i) in heroOffers"
            :key="`${offer.slot}-${offer.heroId}`"
            :offer="offer"
            :index="i"
            :disabled="locked"
            @buy="buy"
          />

          <div v-for="n in soldCount" :key="`sold-${n}`" class="sold" aria-hidden="true" />
        </div>
      </TabsContent>

      <TabsContent value="items" class="list">
        <p class="forge-hint">
          <Anvil :size="14" aria-hidden="true" />
          {{ t('shop.forgeHint') }}
        </p>

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
  flex: 1 1 auto;
  gap: 10px;
  min-height: 0;
}

.economy {
  flex: none;
}

.tabs {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 6px;
}

.list[data-state='inactive'] {
  display: none;
}

.offers {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 8px 4px;
}

.forge-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 4px 0 2px 4px;
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--chalk-dim);
}

.forge-hint svg {
  flex: none;
  margin-top: 1px;
  color: var(--gold);
}

.sold {
  height: 54px;
  border-radius: var(--radius);
  border: 1px dashed var(--edge);
}

.sell-zone {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius);
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
