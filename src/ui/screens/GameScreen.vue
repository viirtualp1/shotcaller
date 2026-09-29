<script setup lang="ts">
import {
  useDocumentVisibility,
  useElementBounding,
  useIntervalFn,
  useMediaQuery,
  useRafFn,
  useTimeoutFn,
  useWindowSize,
} from '@vueuse/core'
import { MousePointerClick } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import type { Insets } from '@/rendering/BoardRenderer'
import { fitMap, WHOLE_BOARD } from '@/rendering/fitMap'
import { laneMapFor } from '@/simulation/map/LaneMap'
import BattlePanel from '../components/battle/BattlePanel.vue'
import LastRoundMeter from '../components/battle/LastRoundMeter.vue'
import BoardView from '../components/board/BoardView.vue'
import ConfirmFightDialog from '../components/dialogs/ConfirmFightDialog.vue'
import GameMenuDialog from '../components/dialogs/GameMenuDialog.vue'
import HelpDrawer from '../components/dialogs/HelpDrawer.vue'
import MatchReportDialog from '../components/dialogs/report/MatchReportDialog.vue'
import RoundSummaryDialog from '../components/dialogs/RoundSummaryDialog.vue'
import CompactDock from '../components/hud/CompactDock.vue'
import DragLayer from '../components/hud/DragLayer.vue'
import GameMenu from '../components/hud/GameMenu.vue'
import NoticeToast from '../components/hud/NoticeToast.vue'
import PhaseBanner from '../components/hud/PhaseBanner.vue'
import MatchScoreboard from '../components/hud/MatchScoreboard.vue'
import ReactionStickers from '../components/hud/ReactionStickers.vue'
import ReactionWheel from '../components/hud/ReactionWheel.vue'
import FightButton from '../components/hud/FightButton.vue'
import TavernStrip from '../components/hud/TavernStrip.vue'
import SynergyTracker from '../components/lanes/SynergyTracker.vue'
import BenchGrid from '../components/roster/BenchGrid.vue'
import HeroCard from '../components/roster/HeroCard.vue'
import ItemCard from '../components/roster/ItemCard.vue'
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

const TUTORIAL_DELAY_MS = 900
const BACKGROUND_TICK_MS = 1000

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
const dock = ref<InstanceType<typeof CompactDock> | null>(null)
const wide = useMediaQuery('(min-width: 1100px)')
/** Phones and tablets; a desktop with a mouse keeps its layout as it is. */
const touch = useMediaQuery('(pointer: coarse)')
/** Phones and tablets on their side keep the dock on the right, so the map stays square. */
const landscape = useMediaQuery('(orientation: landscape)')
const { width: viewportWidth, height: viewportHeight } = useWindowSize()
const topBox = useElementBounding(top)
const leftBox = useElementBounding(left)
const rightBox = useElementBounding(right)
const dockBox = useElementBounding(dock)
/** During a battle the planning tools slide away and the map takes their space. */
const battling = computed(() => store.phase === 'battle')

/** Equal side insets keep the map centred under the scoreboard. */
const sideInset = computed(() =>
  Math.max(battling.value ? 0 : leftBox.right.value, viewportWidth.value - rightBox.left.value),
)

const insets = computed<Insets>(() => {
  if (wide.value) {
    return {
      top: topBox.bottom.value,
      left: sideInset.value,
      right: sideInset.value,
      bottom: 0,
    }
  }

  return {
    top: topBox.bottom.value,
    left: 0,
    right: landscape.value ? Math.max(0, viewportWidth.value - dockBox.left.value) : 0,
    bottom: landscape.value ? 0 : Math.max(0, viewportHeight.value - dockBox.top.value),
  }
})

/** An invisible box over the map so the tutorial can spotlight it. */
const mapAnchor = computed(() => {
  const focus = touch.value && store.view ? laneMapFor(store.view.mode).contentBounds() : WHOLE_BOARD
  const { x, y, size } = fitMap(viewportWidth.value, viewportHeight.value, insets.value, focus)
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${size}px`,
    height: `${size}px`,
  }
})

const placementHint = computed(() => {
  if (!store.isPlanning) {
    return null
  }

  if (store.selectedUid !== null) {
    return t('battle.placeHint')
  }

  return null
})

function frame(seconds: number) {
  /* The timer knows when a pause stops it; a duel's clock keeps running. */
  timer.tick(seconds)

  if (!pause.paused || store.isDuel) {
    store.tick(seconds)
  }
}

useRafFn(({ delta }) => frame(delta / 1000))

/* A hidden tab gets no animation frames; a duel still has to fight and send its board on time. */
const visibility = useDocumentVisibility()

useIntervalFn(() => {
  if (visibility.value === 'hidden' && store.isDuel) {
    frame(BACKGROUND_TICK_MS / 1000)
  }
}, BACKGROUND_TICK_MS)

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
  sell: () => {
    if (store.selectedUid) {
      store.sell(store.selectedUid)
    } else if (store.selectedItem !== null) {
      store.sellItem(store.selectedItem)
    }
  },
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
  <div class="game" :class="wide ? 'wide' : ['compact', landscape ? 'landscape' : 'portrait', { battling }]">
    <div class="board-layer">
      <BoardView
        :key="`${settings.locale}:${store.view?.side}:${store.view?.mode}`"
        :insets="insets"
        :close-up="touch"
      />
    </div>

    <div v-if="mapAnchor" class="map-anchor" :style="mapAnchor" data-tour="board" aria-hidden="true" />

    <header ref="top" class="hud-top">
      <GameMenu class="corner" />

      <div class="top-center">
        <MatchScoreboard />
        <TavernStrip class="tavern" />
        <ReactionStickers v-if="store.isDuel" />
      </div>

      <div class="corner reactions-corner">
        <ReactionWheel v-if="store.isDuel" />
      </div>
    </header>

    <template v-if="wide">
      <aside ref="left" class="hud-left" :class="{ collapsed: battling }" :inert="battling">
        <SynergyTracker />
        <BenchGrid :dense="touch" />
        <StashGrid :dense="touch" />
      </aside>

      <aside ref="right" class="hud-right" :class="{ 'card-open': touch && store.showsCard }">
        <FightButton class="fight-dock" />

        <Transition name="swap" mode="out-in">
          <BattlePanel v-if="store.phase === 'battle'" key="battle" />

          <div v-else key="planning" class="planning" :class="{ split: store.view?.summary }">
            <ShopPanel />
            <LastRoundMeter />
          </div>
        </Transition>

        <!-- Beside the map, never over it: on a tablet the map is too small to spare the room. -->
        <HeroCard class="side-card" />
        <ItemCard class="side-card" />
      </aside>
    </template>

    <CompactDock v-else ref="dock" class="dock" />

    <div class="hud-bottom">
      <Transition name="fade">
        <p v-if="placementHint" class="placement-hint">
          <MousePointerClick :size="15" /> {{ placementHint }}
        </p>
      </Transition>
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
  position: fixed;
  inset: 0;
  overflow: hidden;
}

.board-layer {
  position: absolute;
  inset: 0;
}

.hud-top {
  position: absolute;
  inset: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
  padding: 0 var(--gutter);
  pointer-events: none;
  /* Above the side panels and the dock, so the reaction wheel and the fallen heroes can hang over them. */
  z-index: 12;
}

.hud-top > * {
  pointer-events: auto;
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
}

/* The card shadow falls into the gap and reads as a strip between panels. */
.hud-left :deep(.hud-panel),
.hud-right :deep(.hud-panel) {
  box-shadow: none;
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
}

.wide .hud-top {
  justify-content: space-between;
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

.wide .hud-right {
  right: var(--gutter);
  width: var(--side);
}

/* On desktop the fight button sits in the bottom-right corner, under the shop. */
.wide .fight-dock {
  order: 1;
}

.planning {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

/* Hug the content. A stretched card leaves an empty panel between the shop and the round. */
.planning.split > :deep(.shop),
.planning.split > :deep(.panel) {
  flex: 0 1 auto;
  max-height: calc((100% - 12px) / 2);
  overflow: hidden;
}

/* Between the shop and the fight button; the shop gives up the height. */
.hud-right .side-card {
  flex: none;
  width: 100%;
}

/* On a tablet the column is short: the card takes the shop's place rather than squeezing it. */
.hud-right.card-open > :not(.side-card, .fight-dock) {
  display: none;
}

/* Phones and tablets: the map stays in view and the planning panels share one dock. */
.compact {
  --dock-height: clamp(240px, 44dvh, 480px);
  --dock-width: clamp(290px, 40vw, 400px);
}

.compact.battling {
  --dock-height: clamp(150px, 26dvh, 280px);
}

.compact .hud-top {
  gap: 8px;
  padding: 0 8px;
}

/* Equal corners keep the scoreboard centred even when the reactions corner is empty. */
.compact .hud-top .corner {
  display: flex;
  flex: 1 1 0;
  padding-top: 8px;
}

.hud-top .reactions-corner {
  justify-content: flex-end;
}

.compact .hud-top :deep(.brand) {
  display: none;
}

.dock {
  position: absolute;
  z-index: 10;
  transition:
    height 0.35s ease-in-out,
    width 0.35s ease-in-out;
}

.portrait .dock {
  inset: auto 0 0;
  height: var(--dock-height);
}

.landscape .hud-top {
  right: var(--dock-width);
}

.landscape .dock {
  inset: 0 0 0 auto;
  width: var(--dock-width);
  border-top: 0;
  border-left: 1px solid var(--edge);
}

/* The placement hint sits on the map, clear of the dock. */
.portrait .hud-bottom {
  bottom: calc(var(--dock-height) + 10px);
}

.landscape .hud-bottom {
  left: calc((100% - var(--dock-width)) / 2);
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
