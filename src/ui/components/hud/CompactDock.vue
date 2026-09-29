<script setup lang="ts">
import { ChartColumn, Route, Store, Users } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useDockStore, type DockTab } from '../../stores/dock'
import { useMatchStore } from '../../stores/match'
import BattlePanel from '../battle/BattlePanel.vue'
import LastRoundMeter from '../battle/LastRoundMeter.vue'
import SynergyTracker from '../lanes/SynergyTracker.vue'
import BenchGrid from '../roster/BenchGrid.vue'
import HeroCard from '../roster/HeroCard.vue'
import ItemCard from '../roster/ItemCard.vue'
import StashGrid from '../roster/StashGrid.vue'
import ShopPanel from '../shop/ShopPanel.vue'
import FightButton from './FightButton.vue'

const store = useMatchStore()
const dock = useDockStore()
const { t } = useGameText()
const battling = computed(() => store.phase === 'battle')
const benchCount = computed(() => store.view!.human.bench.length)
/** The tab to return to once the fight is over. */
const planningTab = ref<DockTab>(dock.tab)

watch(
  battling,
  (isBattle, wasBattle) => {
    if (isBattle && wasBattle !== true) {
      planningTab.value = dock.tab
      dock.tab = 'stats'
    } else if (wasBattle === true && !isBattle) {
      dock.tab = planningTab.value
    }
  },
  { immediate: true },
)

const tabs = computed(() => [
  {
    id: 'shop' as DockTab,
    icon: Store,
    badge: 0,
  },
  {
    id: 'heroes' as DockTab,
    icon: Users,
    badge: benchCount.value,
  },
  {
    id: 'lanes' as DockTab,
    icon: Route,
    badge: 0,
  },
  {
    id: 'stats' as DockTab,
    icon: ChartColumn,
    badge: 0,
  },
])
</script>

<template>
  <section class="dock" :class="{ battling }" :aria-label="t('dock.label')">
    <div class="pane">
      <!-- A hero or item card takes the dock's place while it is open: nothing floats over the map. -->
      <Transition name="fade" mode="out-in">
        <div v-if="store.showsCard" key="card" class="stack">
          <HeroCard docked />
          <ItemCard docked />
        </div>

        <BattlePanel v-else-if="battling && dock.tab === 'stats'" key="battle" />
        <ShopPanel v-else-if="dock.tab === 'shop'" key="shop" />

        <div v-else-if="dock.tab === 'heroes'" key="heroes" class="stack">
          <BenchGrid dense />
          <StashGrid dense />
        </div>

        <LastRoundMeter v-else-if="dock.tab === 'stats'" key="stats" placeholder />
        <SynergyTracker v-else key="lanes" />
      </Transition>
    </div>

    <nav class="tabbar" :class="{ battling }">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="dock-tab"
        :class="{ active: dock.tab === tab.id }"
        :aria-pressed="dock.tab === tab.id"
        @click="dock.tab = tab.id"
      >
        <span class="icon">
          <component :is="tab.icon" :size="19" />
          <span v-if="tab.badge" class="badge">{{ tab.badge }}</span>
        </span>

        {{ t(`dock.${tab.id}`) }}
      </button>

      <FightButton v-if="!battling" class="fight" />
    </nav>
  </section>
</template>

<style scoped>
.dock {
  display: flex;
  flex-direction: column;
  background: rgba(12, 18, 16, 0.94);
  border-top: 1px solid var(--edge);
  box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
}

.pane {
  flex: 1;
  min-height: 0;
  padding: 8px 10px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* Tablets in portrait get a wide dock; panels keep their phone proportions in the middle of it. */
.pane > * {
  max-width: 560px;
  margin-inline: auto;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tabbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(0, 1.35fr);
  align-items: center;
  gap: 4px;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--edge);
}

.tabbar.battling {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.dock-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px 2px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--chalk-dim);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.dock-tab.active {
  background: var(--panel-raised);
  color: var(--chalk);
  box-shadow: inset 0 0 0 1px var(--edge-strong);
}

.icon {
  position: relative;
  display: grid;
}

.badge {
  position: absolute;
  top: -5px;
  right: -10px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-size: 10px;
  font-weight: 800;
  line-height: 16px;
  text-align: center;
}

.tabbar .fight {
  min-height: 46px;
}

.fight :deep(.fight) {
  min-height: 46px;
  font-size: 15px;
}
</style>
