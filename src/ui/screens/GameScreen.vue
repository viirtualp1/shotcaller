<script setup lang="ts">
import {
  useDocumentVisibility,
  useElementBounding,
  useEventListener,
  useIntervalFn,
  useMediaQuery,
  useRafFn,
  useTimeoutFn,
  useWindowSize,
} from '@vueuse/core'
import { MousePointerClick, Pointer, Shrink } from '@lucide/vue'
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import type { Insets } from '@/rendering/BoardRenderer'
import { fitMap, MAP_MARGIN, WHOLE_BOARD } from '@/rendering/fitMap'
import { laneMapFor } from '@/simulation/map/LaneMap'
import BattlePanel from '../components/battle/BattlePanel.vue'
import LastRoundMeter from '../components/battle/LastRoundMeter.vue'
import BoardView from '../components/board/BoardView.vue'
import ZoomHint from '../components/board/ZoomHint.vue'
import ConfirmFightDialog from '../components/dialogs/ConfirmFightDialog.vue'
import GameMenuDialog from '../components/dialogs/GameMenuDialog.vue'
import HelpDrawer from '../components/dialogs/HelpDrawer.vue'
import MatchReportDialog from '../components/dialogs/report/MatchReportDialog.vue'
import RoundSummaryDialog from '../components/dialogs/RoundSummaryDialog.vue'
import CompactDock from '../components/hud/CompactDock.vue'
import SandboxPanel from '../components/hud/SandboxPanel.vue'
import DragLayer from '../components/hud/DragLayer.vue'
import GameMenu from '../components/hud/GameMenu.vue'
import NoticeToast from '../components/hud/NoticeToast.vue'
import PhaseBanner from '../components/hud/PhaseBanner.vue'
import DuelPauseBanner from '../components/hud/DuelPauseBanner.vue'
import DuelPauseButton from '../components/hud/DuelPauseButton.vue'
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
import { useGameUiZoom } from '../composables/useGameUiZoom'
import { useZoomHint } from '../composables/useZoomHint'
import { useHotkeys } from '../composables/useHotkeys'
import { useMatchHaptics } from '../composables/useMatchHaptics'
import { useScoreboardAnnouncement } from '../composables/useScoreboardAnnouncement'
import { useScreenAwake } from '../composables/useScreenAwake'
import { useBoardStore } from '../stores/board'
import { useDragStore } from '../stores/drag'
import { useDuelStore } from '../stores/duel'
import { useMatchStore } from '../stores/match'
import { useMenuStore } from '../stores/menu'
import { usePauseStore } from '../stores/pause'
import { usePlanningTimerStore } from '../stores/planningTimer'
import { useSettingsStore } from '../stores/settings'
import { useTutorial } from '../tutorial/useTutorial'

const TUTORIAL_DELAY_MS = 2400
const BACKGROUND_TICK_MS = 1000
let tutorialAfterHint = false

const store = useMatchStore()
const settings = useSettingsStore()
const timer = usePlanningTimerStore()
const menu = useMenuStore()
const pause = usePauseStore()
const drag = useDragStore()
const duel = useDuelStore()
const board = useBoardStore()
const { t } = useGameText()
const tour = useTutorial()
const zoomHint = useZoomHint()
const uiZoom = useGameUiZoom()
const scoreboardOut = useScoreboardAnnouncement(() => store.view)

useScreenAwake(() => store.phase !== null && store.phase !== 'finished')
useMatchHaptics()

const game = ref<HTMLElement | null>(null)
const top = ref<HTMLElement | null>(null)
const scoreboard = ref<HTMLElement | null>(null)
const left = ref<HTMLElement | null>(null)
const right = ref<HTMLElement | null>(null)
const dock = ref<InstanceType<typeof CompactDock> | null>(null)
const sheetPeek = ref<HTMLElement | null>(null)
const wide = useMediaQuery('(min-width: 1100px)')
/** Phones and tablets; a desktop with a mouse keeps its layout as it is. */
const touch = useMediaQuery('(pointer: coarse)')
/** Phones and tablets on their side keep the dock on the right, so the map stays square. */
const landscape = useMediaQuery('(orientation: landscape)')
const { width: viewportWidth, height: viewportHeight } = useWindowSize()
const topBox = useElementBounding(top)
const scoreboardBox = useElementBounding(scoreboard)
const leftBox = useElementBounding(left)
const rightBox = useElementBounding(right)
const dockBox = useElementBounding(dock)
const peekBox = useElementBounding(sheetPeek)
/** During a battle the planning tools slide away and the map takes their space. */
const battling = computed(() => store.phase === 'battle')

/**
 * The bench and the stash stay in view while the lanes panel scrolls. A short window in training keeps one scroll
 * for the whole column, since the training settings leave the lanes too little room to scroll on their own.
 */
const pinned = computed(() => !store.view?.sandbox || viewportHeight.value >= 1000)

/**
 * With a mouse the scoreboard hides above the window behind a handle, and the map lines up with the side panels.
 * It slides out on hover, on entering the match, and at the start and end of rounds.
 */
const peek = computed(() => wide.value && !touch.value)

/** During a battle on a phone held upright the dock folds into a sheet over the map. */
const sheet = computed(() => battling.value && !wide.value && !landscape.value)

/** Equal side insets keep the map centred under the scoreboard. */
const sideInset = computed(() =>
  Math.max(battling.value ? 0 : leftBox.right.value, viewportWidth.value - rightBox.left.value),
)

const insets = computed<Insets>(() => {
  if (peek.value) {
    return {
      top: Math.max(0, leftBox.top.value - MAP_MARGIN),
      left: sideInset.value,
      right: sideInset.value,
      bottom: Math.max(0, viewportHeight.value - leftBox.bottom.value - MAP_MARGIN),
    }
  }

  if (wide.value) {
    return {
      top: topBox.bottom.value,
      left: sideInset.value,
      right: sideInset.value,
      bottom: 0,
    }
  }

  /* On a phone on its side the corner buttons sit beside the map, so only the scoreboard takes height from it. */
  return {
    top: landscape.value ? scoreboardBox.bottom.value : topBox.bottom.value,
    left: 0,
    right: landscape.value ? Math.max(0, viewportWidth.value - dockBox.left.value) : 0,
    /* A sheet lies over the map, so opening it never moves the map: only its folded strip is kept clear. */
    bottom: landscape.value
      ? 0
      : sheet.value
        ? peekBox.height.value
        : Math.max(0, viewportHeight.value - dockBox.top.value),
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

/** The map follows the panels' edges; slides and fades move them without resizing them, so measure again after. */
function measureHud() {
  topBox.update()
  scoreboardBox.update()
  leftBox.update()
  rightBox.update()
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
  togglePause: () => {
    if (!store.isDuel) {
      return
    }

    if (duel.paused) {
      void duel.unpause()
    } else {
      void duel.pause()
    }
  },
})

const { start: startTutorialSoon } = useTimeoutFn(
  () => {
    tutorialAfterHint = zoomHint.show()

    if (!tutorialAfterHint) {
      tour.start()
    }
  },
  TUTORIAL_DELAY_MS,
  { immediate: false },
)

watch(
  () => zoomHint.open,
  (open) => {
    if (!open && tutorialAfterHint) {
      tutorialAfterHint = false
      tour.start()
    }
  },
)

useEventListener(game, ['transitionend', 'animationend'], measureHud)

watch(uiZoom, measureHud, { flush: 'post' })

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

onScopeDispose(() => {
  tutorialAfterHint = false
  zoomHint.setActive(false)
})

onMounted(() => zoomHint.setActive(true))
</script>

<template>
  <div
    ref="game"
    class="game"
    :class="[wide ? 'wide' : ['compact', landscape ? 'landscape' : 'portrait'], { peek, battling }]"
    :style="{
      '--game-zoom': uiZoom,
    }"
  >
    <div class="board-layer">
      <BoardView
        :key="`${settings.locale}:${store.view?.side}:${store.view?.mode}`"
        :insets="insets"
        :close-up="touch"
      />
    </div>

    <div v-if="mapAnchor" class="map-anchor" :style="mapAnchor" data-tour="board" aria-hidden="true" />

    <header ref="top" class="hud-top">
      <!-- With a keyboard, Esc opens the menu, so the corner is left to the side panels. -->
      <div class="corner">
        <GameMenu v-if="touch" />
      </div>

      <div ref="scoreboard" class="top-center" :class="{ out: scoreboardOut }">
        <span v-if="peek" class="handle" aria-hidden="true" />
        <MatchScoreboard />
        <TavernStrip class="tavern" />
        <ReactionStickers v-if="store.isDuel" />
      </div>

      <div class="corner reactions-corner">
        <template v-if="store.isDuel">
          <DuelPauseButton />
          <ReactionWheel />
        </template>

        <button
          v-if="touch && board.zoomed && board.follow === null"
          type="button"
          class="icon-btn"
          :aria-label="t('camera.wholeMap')"
          :title="t('camera.wholeMap')"
          @click="board.resetView()"
        >
          <Shrink :size="18" />
        </button>
      </div>
    </header>

    <template v-if="wide">
      <aside
        ref="left"
        class="hud-left"
        :class="{ collapsed: battling, raised: !touch, pinned }"
        :inert="battling"
      >
        <SandboxPanel />
        <SynergyTracker />
        <BenchGrid :dense="touch" />
        <StashGrid :dense="touch" />
      </aside>

      <aside
        ref="right"
        class="hud-right"
        :class="{ 'card-open': touch && store.showsCard, raised: !touch && !store.isDuel }"
      >
        <FightButton class="fight-dock" />

        <Transition name="swap" mode="out-in">
          <BattlePanel v-if="store.phase === 'battle'" key="battle" />

          <div v-else key="planning" class="planning" :class="{ split: store.view?.summary }">
            <ShopPanel />
            <LastRoundMeter />
          </div>
        </Transition>

        <!-- Beside the map, never over it: on a tablet the map is too small to spare the room. -->
        <template v-if="touch">
          <HeroCard class="side-card" />
          <ItemCard class="side-card" />
        </template>
      </aside>
    </template>

    <template v-else>
      <CompactDock ref="dock" class="dock" :sheet="sheet" />
      <div ref="sheetPeek" class="sheet-peek" aria-hidden="true" />
    </template>

    <!-- Over the map, clear of the dock: notices, the placement hint and, on desktop, the open card. -->
    <div class="hud-bottom">
      <NoticeToast />

      <Transition name="fade">
        <p v-if="placementHint" class="placement-hint">
          <Pointer v-if="touch" :size="15" />
          <MousePointerClick v-else :size="15" />
          {{ placementHint }}
        </p>
      </Transition>

      <template v-if="wide && !touch">
        <HeroCard spread />
        <ItemCard />
      </template>
    </div>

    <PhaseBanner />
    <DuelPauseBanner v-if="store.isDuel" />
    <DragLayer />
    <RoundSummaryDialog />
    <ConfirmFightDialog />
    <MatchReportDialog />
    <HelpDrawer v-model:open="menu.help" />
    <GameMenuDialog />
    <ZoomHint />
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
  inset: env(safe-area-inset-top, 0px) 0 auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
  padding: 0 var(--gutter);
  pointer-events: none;
  /* Above the side panels and the dock, so the reaction wheel and the fallen heroes can hang over them. */
  z-index: 12;
  zoom: var(--game-zoom);
}

.hud-top > * {
  pointer-events: auto;
}

/* An empty corner must not catch clicks meant for the side panel under it. */
.hud-top > .corner:empty {
  pointer-events: none;
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

/*
 * Mouse play: the scoreboard waits above the window, and a gold handle at the top edge marks where it is. Hovering the
 * handle slides it out; it slides back a moment after the pointer leaves.
 */
.peek .top-center {
  pointer-events: none;
}

.peek .top-center > * {
  pointer-events: auto;
}

.peek .top-center > .scoreboard {
  position: relative;
  z-index: 1;
  translate: 0 calc(-100% - 16px);
  transition: translate 0.25s ease-in 0.4s;
}

.peek .top-center:hover > .scoreboard,
.peek .top-center:focus-within > .scoreboard,
.peek .top-center.out > .scoreboard {
  translate: 0 0;
  transition: translate 0.25s ease-out;
}

/* A wide strip catches the pointer; the pill inside it is what shows. */
.handle {
  position: absolute;
  top: 0;
  left: 50%;
  translate: -50% 0;
  display: flex;
  justify-content: center;
  width: 200px;
  height: 24px;
}

.handle::before {
  content: '';
  width: 120px;
  height: 6px;
  border-radius: 999px;
  background: var(--gold);
  box-shadow: 0 0 12px rgba(244, 197, 91, 0.45);
  opacity: 0.85;
  transition: opacity 0.2s;
}

.top-center:hover .handle::before {
  opacity: 1;
}

/* The fallen heroes stay in view under the handle while the scoreboard is away. */
.peek .tavern {
  top: 28px;
  transition: top 0.25s ease-in 0.4s;
}

.peek .top-center:hover .tavern,
.peek .top-center:focus-within .tavern,
.peek .top-center.out .tavern {
  top: calc(100% + 10px);
  transition: top 0.25s ease-out;
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
  inset-inline: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 20;
  pointer-events: none;
  zoom: var(--game-zoom);
}

.hud-bottom :deep(.hero-card),
.hud-bottom :deep(.item-card) {
  max-height: calc((100dvh - 100px) / var(--game-zoom));
  overflow: auto;
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
  /* As wide as leaves the map the full height of the window, so it lines up with the panels on a 16:9 screen. */
  --side: clamp(290px, (100vw - 100dvh - 24px) / 2 / var(--game-zoom), 420px);
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
  top: calc(84px + env(safe-area-inset-top, 0px));
  bottom: var(--gutter);
  padding: 0;
  /* A sideways slide must not open a scrollbar for a moment and shove the column. */
  overflow-x: hidden;
  overflow-y: auto;
  z-index: 10;
  zoom: var(--game-zoom);
}

/* Beside an empty corner a panel rises to the top of the window and gains its height. */
.wide .hud-left.raised,
.wide .hud-right.raised {
  top: calc(var(--gutter) + env(safe-area-inset-top, 0px));
}

/* The shop and the round meter scroll inside themselves. The column must not grow a bar while they slide away. */
.wide .hud-right {
  overflow: hidden;
}

.wide .hud-right.card-open {
  overflow-x: hidden;
  overflow-y: auto;
}

.wide .hud-left {
  left: var(--gutter);
  width: var(--side);
  transition:
    translate 0.35s ease-in-out,
    opacity 0.35s ease-in-out;
}

/*
 * The bench and the stash stay in view as drop targets: a busy lanes panel scrolls on its own instead. Only a window
 * too short for even one lane falls back to scrolling the whole column.
 */
.wide .hud-left {
  gap: 8px;
}

.wide .hud-left.pinned > * {
  flex: none;
}

.wide .hud-left.pinned > [data-tour='tracker'] {
  flex: 0 1 auto;
  min-height: 180px;
  overflow-y: auto;
  scrollbar-width: thin;
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
  overflow: hidden;
}

/* As tall as the offers. Only when that is taller than the column does the list scroll. */
.planning.split > :deep(.shop) {
  flex: 0 0 auto;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
}

/* The training catalog lists every hero; it leaves the round meter room to stay readable. */
.planning.split > :deep(.shop.training) {
  max-height: min(440px, 100%);
}

/* The round meter takes the rest and scrolls there. */
.planning.split > :deep(.panel) {
  flex: 1 1 auto;
  min-height: 0;
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
  /* What a folded battle sheet leaves over the map: the button that opens it, above the home indicator. */
  --sheet-peek: calc(60px + env(safe-area-inset-bottom, 0px));
}

/* Measures the folded sheet for the map's insets. */
.sheet-peek {
  position: fixed;
  inset: auto 0 0;
  height: var(--sheet-peek);
  visibility: hidden;
  pointer-events: none;
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
  align-items: flex-start;
  gap: 8px;
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

.portrait.battling .hud-bottom {
  bottom: calc(var(--sheet-peek) + 10px);
}

.landscape .hud-bottom {
  right: calc(var(--dock-width) + 16px);
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
