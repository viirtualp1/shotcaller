<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { Coins, X } from '@lucide/vue'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useBoardStore } from '../../stores/board'
import { useMatchStore } from '../../stores/match'
import ItemDetails from '../common/ItemDetails.vue'
import ItemIcon from '../common/ItemIcon.vue'

/** Presses that keep the card open: the card, the stash and the heroes the item can go to. */
const KEEP_OPEN = '.item-card, [data-stash-item], [data-drop^="hero:"]'

/** `docked`: shown inside a panel on small screens rather than floating. */
withDefaults(defineProps<{ docked?: boolean }>(), { docked: false })

const store = useMatchStore()
const board = useBoardStore()
const text = useGameText()
const { t } = text

const item = computed(() => {
  const index = store.selectedItem
  return index === null || !store.isPlanning ? null : (store.view?.human.stash[index] ?? null)
})

function closeOnOutsidePress(event: PointerEvent) {
  if (!item.value) {
    return
  }

  const target = event.target
  if (target instanceof Element && target.closest(KEEP_OPEN)) {
    return
  }

  const renderer = board.renderer
  if (
    renderer &&
    target instanceof HTMLCanvasElement &&
    renderer.tokenAtClient(event.clientX, event.clientY)
  ) {
    return
  }

  store.clearSelection()
}

useEventListener(document, 'pointerdown', closeOnOutsidePress, { capture: true })
</script>

<template>
  <Transition name="card">
    <aside v-if="item" :key="item.index" class="item-card" :class="{ docked }" aria-live="polite">
      <header class="head">
        <ItemIcon :item-id="item.itemId" :size="54" />

        <strong class="name">{{ text.itemName(item.itemId) }}</strong>

        <button
          type="button"
          class="close icon-btn"
          :aria-label="t('card.close')"
          @click="store.clearSelection()"
        >
          <X :size="16" />
        </button>
      </header>

      <ItemDetails class="details" :item-id="item.itemId" :heading="false" />

      <footer class="bottom">
        <span class="hint">{{ t('battle.itemHint') }}</span>

        <button type="button" class="btn danger" title="E" @click="store.sellItem(item.index)">
          <Coins :size="15" />
          {{ t('card.sell', { gold: item.sellValue }) }}
        </button>
      </footer>
    </aside>
  </Transition>
</template>

<style scoped>
/*
 * Docked in a panel instead of floating: full width, and what the player acts on (items, selling) comes
 * right under the name, so a small screen needs no scrolling to reach it.
 */
.item-card.docked {
  width: 100%;
  box-shadow: none;
  backdrop-filter: none;
}

.item-card.docked .head {
  order: -2;
}

.item-card.docked .bottom {
  order: -1;
  padding: 0 0 10px;
  border-top: 0;
  border-bottom: 1px solid var(--edge);
}

.card-enter-active {
  transition:
    opacity 0.18s ease-out,
    transform 0.18s ease-out;
}

.item-card.card-leave-active {
  position: absolute;
  bottom: 0;
  left: 50%;
  /* `translate` is ignored under the board zoom, so the card would sit on the right edge. */
  transform: translateX(-50%);
  transition: opacity 0.12s ease-in;
}

.card-enter-from {
  opacity: 0;
  transform: scale(0.97);
}

.card-leave-to {
  opacity: 0;
}

.item-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(380px, calc(100vw - 32px));
  padding: 12px 14px 14px;
  border-radius: var(--radius);
  background: rgba(17, 24, 21, 0.96);
  border: 1px solid rgba(244, 197, 91, 0.45);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  font-size: 13px;
  pointer-events: auto;
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: -12px -14px 0;
  padding: 12px 14px 10px;
  border-radius: var(--radius) var(--radius) 0 0;
  border-bottom: 1px solid var(--edge);
  background: linear-gradient(90deg, rgba(244, 197, 91, 0.16), transparent 70%);
}

.name {
  flex: 1;
  min-width: 0;
  font-size: 17px;
}

.close {
  align-self: flex-start;
}

.details {
  width: auto;
}

.bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--edge);
}

.hint {
  font-size: 12px;
  color: var(--chalk-dim);
}

.bottom .btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
}

.danger:hover {
  border-color: var(--theirs);
  color: var(--theirs);
}
</style>
