<script setup lang="ts">
import { useElementBounding, useMediaQuery, useRafFn, useTimeoutFn, useWindowSize } from '@vueuse/core'
import { MousePointerClick } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import type { Insets } from '@/rendering/BoardRenderer'
import BattlePanel from '../components/battle/BattlePanel.vue'
import BoardView from '../components/board/BoardView.vue'
import ConfirmFightDialog from '../components/dialogs/ConfirmFightDialog.vue'
import GameMenuDialog from '../components/dialogs/GameMenuDialog.vue'
import HelpDrawer from '../components/dialogs/HelpDrawer.vue'
import MatchReportDialog from '../components/dialogs/report/MatchReportDialog.vue'
import RoundSummaryDialog from '../components/dialogs/RoundSummaryDialog.vue'
import DragLayer from '../components/hud/DragLayer.vue'
import GameMenu from '../components/hud/GameMenu.vue'
import NoticeToast from '../components/hud/NoticeToast.vue'
import PhaseBanner from '../components/hud/PhaseBanner.vue'
import MatchScoreboard from '../components/hud/MatchScoreboard.vue'
import FightButton from '../components/hud/FightButton.vue'
import TavernStrip from '../components/hud/TavernStrip.vue'
import SynergyTracker from '../components/lanes/SynergyTracker.vue'
import BenchGrid from '../components/roster/BenchGrid.vue'
import HeroCard from '../components/roster/HeroCard.vue'
import StashGrid from '../components/roster/StashGrid.vue'
import ShopPanel from '../components/shop/ShopPanel.vue'
import { useFightRequest } from '../composables/useFightRequest'
import { useGameText } from '../composables/useGameText'
import { useHotkeys } from '../composables/useHotkeys'
import { useDragStore } from '../stores/drag'
import { useMatchStore } from '../stores/match'
import { useMenuStore } from '../stores/menu'
import { usePauseStore } from '../stores/pause'
import { usePlanningTimerStore } from '../stores/planningTimer'
import { useSettingsStore } from '../stores/settings'
import { useTutorial } from '../tutorial/useTutorial'

/** Must match the margin BoardRenderer keeps around the map. */
const MAP_MARGIN = 12
const TUTORIAL_DELAY_MS = 900

const store = useMatchStore()
const settings = useSettingsStore()
const timer = usePlanningTimerStore()
const menu = useMenuStore()
const pause = usePauseStore()
const drag = useDragStore()
const { t } = useGameText()
const tour = useTutorial()

const top = ref<HTMLElement | null>(null)
const left = ref<HTMLElement | null>(null)
const right = ref<HTMLElement | null>(null)
const wide = useMediaQuery('(min-width: 1100px)')
const { width: viewportWidth, height: viewportHeight } = useWindowSize()
const topBox = useElementBounding(top)
const leftBox = useElementBounding(left)
const rightBox = useElementBounding(right)
/** During a battle the planning tools slide away and the map takes their space. */
const battling = computed(() => store.phase === 'battle')

/** Equal side insets keep the map centred under the scoreboard. */
const sideInset = computed(() =>
  Math.max(battling.value ? 0 : leftBox.right.value, viewportWidth.value - rightBox.left.value),
)

const insets = computed<Insets>(() =>
  wide.value
    ? {
        top: topBox.bottom.value,
        left: sideInset.value,
        right: sideInset.value,
        bottom: 0,
      }
    : {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
)

/** An invisible box over the map so the tutorial can spotlight it. */
const mapAnchor = computed(() => {
  if (!wide.value) {
    return null
  }

  const { top: t0, left: l0, right: r0, bottom: b0 } = insets.value
  const width = viewportWidth.value - l0 - r0 - MAP_MARGIN * 2
  const height = viewportHeight.value - t0 - b0 - MAP_MARGIN * 2
  const size = Math.max(0, Math.min(width, height))
  return {
    left: `${l0 + MAP_MARGIN + (width - size) / 2}px`,
    top: `${t0 + MAP_MARGIN + (height - size) / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
  }
})

const placementHint = computed(() => {
  if (!store.isPlanning) {
    return null
  }

  if (store.selectedItem !== null) {
    return t('battle.itemHint')
  }

  if (store.selectedUid !== null) {
    return t('battle.placeHint')
  }

  return null
})

useRafFn(({ delta }) => {
  if (pause.paused) {
    return
  }

  store.tick(delta / 1000)
  timer.tick(delta / 1000)
})

/** Esc backs out of the current action first and opens the menu when there is nothing to cancel. */
function escape() {
  if (drag.payload) {
    drag.end()
  } else if (store.hasSelection) {
    store.clearSelection()
  } else {
    menu.gameMenu = true
  }
}

useHotkeys({
  reroll: store.reroll,
  buyXp: store.buyXp,
  fight: useFightRequest(),
  sell: () => store.selectedUid && store.sell(store.selectedUid),
  cancel: escape,
})

const { start: startTutorialSoon } = useTimeoutFn(() => tour.start(), TUTORIAL_DELAY_MS, { immediate: false })

watch(
  () => menu.tutorialPending,
  (pending) => {
    if (!pending) {
      return
    }

    menu.tutorialPending = false
    startTutorialSoon()
  },
  { immediate: true },
)
</script>

<template>
  <div class="game" :class="{ wide }">
    <div class="board-layer">
      <BoardView :key="settings.locale" :insets="insets" />
    </div>

    <div v-if="mapAnchor" class="map-anchor" :style="mapAnchor" data-tour="board" aria-hidden="true" />

    <header ref="top" class="hud-top">
      <GameMenu class="corner" />

      <div class="top-center">
        <MatchScoreboard />
        <TavernStrip class="tavern" />
      </div>

      <span class="corner" />
    </header>

    <aside ref="left" class="hud-left" :class="{ collapsed: battling }" :inert="battling">
      <SynergyTracker />
      <BenchGrid />
      <StashGrid />
    </aside>

    <aside ref="right" class="hud-right">
      <FightButton class="fight-dock" />

      <Transition name="swap" mode="out-in">
        <BattlePanel v-if="store.phase === 'battle'" key="battle" />
        <ShopPanel v-else key="shop" class="shop-fill" />
      </Transition>
    </aside>

    <div class="hud-bottom">
      <Transition name="fade">
        <p v-if="placementHint" class="placement-hint">
          <MousePointerClick :size="15" /> {{ placementHint }}
        </p>
      </Transition>

      <HeroCard />
    </div>

    <PhaseBanner />
    <DragLayer />
    <RoundSummaryDialog />
    <ConfirmFightDialog />
    <MatchReportDialog />
    <HelpDrawer v-model:open="menu.help" />
    <GameMenuDialog />
    <NoticeToast />
  </div>
</template>

<style scoped>
.game {
  --gutter: 14px;
  position: relative;
  min-height: 100%;
}

.board-layer {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-width: 720px;
  margin: 0 auto;
}

.hud-top {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
  padding: 0 var(--gutter);
}

.top-center {
  position: relative;
}

.tavern {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  translate: -50% 0;
  width: max-content;
  min-width: 100%;
}

.hud-top .corner {
  display: none;
}

.hud-left,
.hud-right {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px var(--gutter);
}

.hud-bottom {
  position: fixed;
  left: 50%;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  translate: -50% 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 20;
  pointer-events: none;
}

.hud-bottom > * {
  pointer-events: auto;
}

.placement-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--ink);
  font-weight: 700;
  font-size: 13px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}

.map-anchor {
  position: fixed;
  pointer-events: none;
}

/* Desktop: the board fills the window and the HUD sits on its edges. */
.game.wide {
  --side: clamp(290px, 22vw, 420px);
  position: fixed;
  inset: 0;
  overflow: hidden;
}

.wide .board-layer {
  position: absolute;
  inset: 0;
  max-width: none;
  aspect-ratio: auto;
}

.wide .hud-top {
  position: absolute;
  inset: 0 0 auto;
  justify-content: space-between;
  pointer-events: none;
  z-index: 10;
}

.wide .hud-top > * {
  pointer-events: auto;
}

.wide .hud-top .corner {
  display: flex;
  flex: 1 1 0;
  min-width: 200px;
  padding-top: 12px;
}

.wide .hud-left,
.wide .hud-right {
  position: absolute;
  top: 84px;
  bottom: var(--gutter);
  padding: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  z-index: 10;
}

.wide .hud-left {
  left: var(--gutter);
  width: var(--side);
  transition:
    translate 0.35s ease-in-out,
    opacity 0.35s ease-in-out;
}

.wide .hud-left.collapsed {
  translate: calc(-100% - var(--gutter)) 0;
  opacity: 0;
}

.game:not(.wide) .hud-left.collapsed {
  display: none;
}

.wide .hud-right {
  right: var(--gutter);
  width: var(--side);
}

/* On desktop the fight button sits in the bottom-right corner, under the shop. */
.wide .fight-dock {
  order: 1;
}

.shop-fill {
  flex: 1;
  min-height: 0;
}

.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.25s,
    transform 0.3s ease;
}

.swap-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.swap-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
