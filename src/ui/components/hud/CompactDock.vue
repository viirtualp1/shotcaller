<script setup lang="ts">
import { ChartColumn, ChevronUp, Route, Store, Users } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { clamp } from '@/core/math/vec2'
import { useGameText } from '../../composables/useGameText'
import { useHaptics } from '../../composables/useHaptics'
import { useDockStore, type DockTab } from '../../stores/dock'
import { useMatchStore } from '../../stores/match'
import BattlePanel from '../battle/BattlePanel.vue'
import LastRoundMeter from '../battle/LastRoundMeter.vue'
import SynergyTracker from '../lanes/SynergyTracker.vue'
import BenchGrid from '../roster/BenchGrid.vue'
import BenchStrip from '../roster/BenchStrip.vue'
import HeroCard from '../roster/HeroCard.vue'
import ItemCard from '../roster/ItemCard.vue'
import StashGrid from '../roster/StashGrid.vue'
import ShopPanel from '../shop/ShopPanel.vue'
import SandboxPanel from './SandboxPanel.vue'
import FightButton from './FightButton.vue'

interface SheetDrag {
  readonly startY: number
  readonly startOffset: number
  lastY: number
  lastTime: number
  /** Pixels per millisecond, downwards positive. */
  velocity: number
  moved: boolean
}

/** A finger moving less than this is a tap on the grabber. */
const TAP_SLOP = 6
/** A flick this fast settles the sheet in its direction, wherever it was let go. */
const FLICK_SPEED = 0.4

let drag: SheetDrag | null = null
/** A drag ends with a click on the grabber; it must not toggle the sheet a second time. */
let dragged = false

/**
 * `sheet`: during a battle on a phone held upright, the dock lies over the map and folds away below the screen. A
 * floating button, kept clear of the system's swipe strip at the bottom edge, brings it back with a tap or a pull
 * upwards; the gold grabber on top of the open sheet closes it the same way, as an iPhone sheet.
 */
const props = withDefaults(defineProps<{ sheet?: boolean }>(), { sheet: false })

const store = useMatchStore()
const dock = useDockStore()
const { t } = useGameText()
const haptics = useHaptics()
const root = ref<HTMLElement | null>(null)
const open = ref(false)
/** Where a finger holds the sheet, in pixels below fully open; null when it rests. */
const dragOffset = ref<number | null>(null)
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

const sheetStyle = computed(() =>
  dragOffset.value === null
    ? undefined
    : {
        transform: `translateY(${dragOffset.value}px)`,
        transition: 'none',
      },
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

/** How far the sheet travels between open and folded: its whole height. */
function travel() {
  return root.value?.offsetHeight ?? 0
}

function setOpen(next: boolean) {
  if (next !== open.value) {
    haptics.buzz('pickUp')
  }

  open.value = next
}

function toggle() {
  if (dragged) {
    dragged = false

    return
  }

  setOpen(!open.value)
}

function grab(e: PointerEvent) {
  if (!props.sheet || e.button !== 0) {
    return
  }

  /* The grabber keeps the finger once it slides off the strip onto the map. */
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    /* A pointer the browser no longer tracks has nothing to capture. */
  }

  dragged = false

  drag = {
    startY: e.clientY,
    startOffset: open.value ? 0 : travel(),
    lastY: e.clientY,
    lastTime: e.timeStamp,
    velocity: 0,
    moved: false,
  }
}

function pull(e: PointerEvent) {
  if (!drag) {
    return
  }

  const dy = e.clientY - drag.startY
  if (!drag.moved && Math.abs(dy) < TAP_SLOP) {
    return
  }

  drag.moved = true
  drag.velocity = (e.clientY - drag.lastY) / Math.max(16, e.timeStamp - drag.lastTime)
  drag.lastY = e.clientY
  drag.lastTime = e.timeStamp
  dragOffset.value = clamp(drag.startOffset + dy, 0, travel())
}

/** A flick goes where it was thrown; a slow release settles on the nearer end. */
function release() {
  const current = drag
  drag = null

  if (!current?.moved || dragOffset.value === null) {
    dragOffset.value = null

    return
  }

  dragged = true

  if (current.velocity > FLICK_SPEED) {
    setOpen(false)
  } else if (current.velocity < -FLICK_SPEED) {
    setOpen(true)
  } else {
    setOpen(dragOffset.value < travel() / 2)
  }

  dragOffset.value = null
}

/* Every battle starts with the sheet folded, so the whole map is in view. */
watch(
  () => props.sheet,
  () => {
    open.value = false
    dragOffset.value = null
    drag = null
  },
)
</script>

<template>
  <section
    ref="root"
    class="dock"
    :class="{ battling, folds: sheet, open, dragging: dragOffset !== null }"
    :style="sheetStyle"
    :aria-label="t('dock.label')"
  >
    <Teleport to="body">
      <button
        v-if="sheet && !open && dragOffset === null"
        type="button"
        class="btn reopen"
        :aria-expanded="false"
        @pointerdown="grab"
        @pointermove="pull"
        @pointerup="release"
        @pointercancel="release"
        @click="toggle"
      >
        <ChevronUp :size="18" /> {{ t('dock.panel') }}
      </button>
    </Teleport>

    <button
      v-if="sheet"
      type="button"
      class="grabber"
      :aria-expanded="open"
      :aria-label="t(open ? 'dock.collapse' : 'dock.expand')"
      @pointerdown="grab"
      @pointermove="pull"
      @pointerup="release"
      @pointercancel="release"
      @click="toggle"
    >
      <span class="pill" />
    </button>

    <div class="pane" :inert="sheet && !open">
      <!-- A hero or item card takes the dock's place while it is open: nothing floats over the map. -->
      <Transition name="fade" mode="out-in">
        <div v-if="store.showsCard" key="card" class="stack">
          <HeroCard docked />
          <ItemCard docked />
        </div>

        <BattlePanel v-else-if="battling && dock.tab === 'stats'" key="battle" />

        <div v-else-if="dock.tab === 'shop'" key="shop" class="stack">
          <BenchStrip v-if="store.isPlanning && benchCount > 0" />
          <ShopPanel />
        </div>

        <div v-else-if="dock.tab === 'heroes'" key="heroes" class="stack">
          <SandboxPanel />
          <BenchGrid dense />
          <StashGrid dense />
        </div>

        <LastRoundMeter v-else-if="dock.tab === 'stats'" key="stats" placeholder />
        <SynergyTracker v-else key="lanes" />
      </Transition>
    </div>

    <nav class="tabbar" :class="{ battling }" :inert="sheet && !open">
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

/* Folded, the sheet waits below the screen; opened, it lies over the map. */
.dock.folds {
  border-radius: var(--radius) var(--radius) 0 0;
  transform: translateY(100%);
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.dock.folds:not(.open, .dragging) {
  box-shadow: none;
}

.dock.folds.open {
  transform: none;
}

/*
 * Above the bottom edge, where iPhones and Android phones swipe to leave the app: a labelled button there could not
 * be mistaken for the system's own strip, and a pull that starts on it never reaches the edge.
 */
.reopen {
  position: fixed;
  left: 50%;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 11;
  translate: -50% 0;
  min-height: 36px;
  padding-inline: 14px;
  border-color: rgba(244, 197, 91, 0.55);
  background: rgba(17, 24, 21, 0.92);
  color: var(--gold);
  font-weight: 700;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  touch-action: none;
  animation: fade-in 0.2s ease-out;
}

/* The same gold pill as the desktop scoreboard's handle, with a full-width strip to catch the finger. */
.grabber {
  display: flex;
  flex: none;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 30px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: grab;
  touch-action: none;
}

.pill {
  width: 120px;
  height: 6px;
  border-radius: 999px;
  background: var(--gold);
  box-shadow: 0 0 12px rgba(244, 197, 91, 0.45);
  opacity: 0.85;
  transition: opacity 0.2s;
}

.grabber:active .pill,
.dock.open .pill {
  opacity: 1;
}

.folds .pane {
  padding-top: 0;
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
  border-radius: var(--radius);
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
  gap: 6px;
  padding-inline: 8px;
  font-size: 15px;
}
</style>
