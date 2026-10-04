<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { Coins, X } from '@lucide/vue'
import { computed } from 'vue'
import { HEROES } from '@/content/heroes'
import { ITEM_SLOTS } from '@/content/items'
import { heroCanEquip } from '@/domain/items/Stash'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { useLiveHeroVitals } from '../../composables/useLiveHeroVitals'
import { useBoardStore } from '../../stores/board'
import { useDragStore } from '../../stores/drag'
import { loadoutOf, useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'
import HeroDetails from '../common/HeroDetails.vue'
import InfoTooltip from '../common/InfoTooltip.vue'
import ItemDetails from '../common/ItemDetails.vue'
import ItemIcon from '../common/ItemIcon.vue'
import TalentPicker from './TalentPicker.vue'

/** Presses that keep the card open: the card itself and everything that acts on the selected hero. */
const KEEP_OPEN =
  '.hero-card, [data-drop^="lane:"], [data-drop^="hero:"], [data-drop="bench"], [data-stash-item]'

/** `docked`: inside a short panel, with selling under the name. `spread`: a wide card over the map. */
withDefaults(defineProps<{ docked?: boolean; spread?: boolean }>(), {
  docked: false,
  spread: false,
})

const store = useMatchStore()
const board = useBoardStore()
const drag = useDragStore()
const text = useGameText()
const { t } = text
const located = computed(() => store.selected ?? store.inspected)
const vitals = useLiveHeroVitals(() => located.value?.hero.uid ?? null)
/** Opponent heroes are shown read-only: no selling, benching or item management. */
const enemy = computed(() => !store.selected && store.inspected !== null)
const canManage = computed(() => !enemy.value && store.isPlanning)
const draggedItem = computed(() => (drag.active && drag.payload?.kind === 'item' ? drag.payload : null))
const equipping = computed(() => draggedItem.value !== null && canManage.value)

const canReceiveItem = computed(() => {
  const item = draggedItem.value
  const hero = located.value?.hero

  if (!item || !hero) {
    return false
  }

  return heroCanEquip(hero.items, item.itemId)
})

const equipHovered = computed(
  () => drag.target?.kind === 'hero' && drag.target.uid === located.value?.hero.uid,
)

const loadout = computed(() => {
  const view = store.view
  const hero = located.value

  return view && hero ? loadoutOf(enemy.value ? view.opponent : view.human, hero) : null
})

const slots = computed(() =>
  Array.from({ length: ITEM_SLOTS }, (_, index) => ({
    index,
    itemId: located.value?.hero.items[index] ?? null,
  })),
)

const accent = computed(() => (located.value ? cssColor(HEROES[located.value.hero.heroId].color) : undefined))

function closeOnOutsidePress(event: PointerEvent) {
  if (!located.value) {
    return
  }

  const target = event.target

  if (target instanceof Element && target.closest(KEEP_OPEN)) {
    return
  }

  const renderer = board.renderer

  if (renderer && target instanceof HTMLCanvasElement) {
    const onLane = store.selectedUid !== null && renderer.laneAtClient(event.clientX, event.clientY) !== null

    if (onLane || renderer.tokenAtClient(event.clientX, event.clientY)) {
      return
    }
  }

  store.clearSelection()
}

useEventListener(document, 'pointerdown', closeOnOutsidePress, { capture: true })
</script>

<template>
  <Transition name="card">
    <aside
      v-if="located"
      :key="located.hero.uid"
      class="hero-card"
      :class="{ enemy, docked, spread }"
      :style="{ '--hero': accent }"
      aria-live="polite"
    >
      <header class="head">
        <HeroAvatar
          :hero-id="located.hero.heroId"
          :stars="located.hero.stars"
          :team="enemy ? 1 : 0"
          :size="54"
        />

        <span class="who">
          <span v-if="enemy" class="side">{{ t('card.enemy') }}</span>

          <strong class="name">{{ text.heroName(located.hero.heroId) }}</strong>
        </span>

        <button
          type="button"
          class="close icon-btn"
          :aria-label="t('card.close')"
          @click="store.clearSelection()"
        >
          <X :size="16" />
        </button>
      </header>

      <div class="columns">
        <HeroDetails
          v-if="loadout"
          class="details"
          v-bind="loadout"
          :vitals="vitals"
          :heading="false"
          :item-icons="false"
        />

        <div class="rail">
          <TalentPicker
            :hero-id="located.hero.heroId"
            :stars="located.hero.stars"
            :talent="located.hero.talent"
            :can-choose="canManage"
            @choose="store.chooseTalent(located.hero.uid, $event)"
          />

          <footer class="bottom">
            <div class="items">
              <template v-for="slot in slots" :key="slot.index">
                <InfoTooltip v-if="slot.itemId" side="top">
                  <button
                    type="button"
                    class="slot filled"
                    :class="{ locked: !canManage }"
                    :aria-label="text.itemName(slot.itemId)"
                    @click="canManage && store.unequip(located.hero.uid, slot.index)"
                  >
                    <ItemIcon :item-id="slot.itemId" :size="44" />
                  </button>

                  <template #content>
                    <ItemDetails
                      :item-id="slot.itemId"
                      :hero="loadout"
                      equipped
                      :hint="canManage ? t('card.unequipHint') : undefined"
                    />
                  </template>
                </InfoTooltip>

                <span v-else class="slot empty" :title="enemy ? undefined : t('card.noItems')" />
              </template>
            </div>

            <div v-if="!enemy" class="actions">
              <button
                type="button"
                class="btn danger"
                :disabled="!store.isPlanning"
                title="E"
                @click="store.sell(located.hero.uid)"
              >
                <Coins :size="15" />
                {{ t('card.sell', { gold: located.hero.sellValue }) }}
              </button>
            </div>
          </footer>
        </div>
      </div>

      <Transition name="fade">
        <div
          v-if="equipping && located"
          class="equip-zone"
          :class="{ hovered: equipHovered, blocked: !canReceiveItem }"
          :data-drop="`hero:${located.hero.uid}`"
        >
          {{ canReceiveItem ? t('card.equipZone') : t('card.equipFull') }}
        </div>
      </Transition>
    </aside>
  </Transition>
</template>

<style scoped>
/*
 * Docked in a panel instead of floating: full width, and what the player acts on (items, selling) comes
 * right under the name, so a small screen needs no scrolling to reach it.
 */
.hero-card.docked {
  width: 100%;
  box-shadow: none;
  backdrop-filter: none;
}

.hero-card.docked .head {
  order: -2;
}

.hero-card.docked .bottom {
  order: -1;
  padding: 0 0 10px;
  border-top: 0;
  border-bottom: 1px solid var(--edge);
}

/* A card for another hero fades in over the old one; the old one leaves the layout so nothing jumps. */
.card-enter-active {
  transition:
    opacity 0.18s ease-out,
    transform 0.18s ease-out;
}

.hero-card.card-leave-active {
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

.hero-card {
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

.hero-card.enemy {
  border-color: rgba(255, 112, 96, 0.5);
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: -12px -14px 0;
  padding: 12px 14px 10px;
  border-radius: var(--radius) var(--radius) 0 0;
  border-bottom: 1px solid var(--edge);
  background: linear-gradient(90deg, color-mix(in srgb, var(--hero) 22%, transparent), transparent 70%);
}

.who {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.side {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--theirs);
}

.name {
  font-size: 17px;
}

.details {
  width: auto;
}

.bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--edge);
}

.items {
  display: flex;
  gap: 6px;
}

.slot {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0;
  border-radius: var(--radius);
  background: transparent;
}

.slot.filled {
  border: 0;
  cursor: pointer;
  transition: transform 0.12s;
}

.slot.filled:hover:not(.locked) {
  transform: translateY(-2px);
}

.slot.locked {
  cursor: default;
}

.slot.empty {
  border: 1px dashed var(--edge-strong);
  background: rgba(0, 0, 0, 0.2);
}

.actions {
  display: flex;
  gap: 8px;
}

.actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.danger:hover:not(:disabled) {
  border-color: var(--theirs);
  color: var(--theirs);
}

.close {
  align-self: flex-start;
}

/* The phone dock and the tablet column stay one stack. These wrappers only exist for the wide card. */
.columns,
.rail {
  display: contents;
}

/*
 * Wide card over the map. Columns are part of the first paint, so the card does not
 * slide into place after it opens.
 */
.hero-card.spread {
  flex-shrink: 0;
  width: min(1040px, calc((100vw - 80px) / var(--game-zoom, 1) - 2 * var(--side, 0px)));
}

.hero-card.spread .columns {
  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
  grid-template-areas:
    'facts kit'
    'rail rail';
  gap: 12px 16px;
  align-items: stretch;
}

.hero-card.spread .details {
  display: contents;
}

.hero-card.spread :deep(.facts) {
  grid-area: facts;
}

.hero-card.spread :deep(.kit) {
  grid-area: kit;
  padding-left: 16px;
  border-left: 1px solid var(--edge);
}

.hero-card.spread .rail {
  display: flex;
  grid-area: rail;
  flex-direction: row;
  align-items: flex-end;
  gap: 14px;
  min-width: 0;
  padding-top: 12px;
  border-top: 1px solid var(--edge);
}

.hero-card.spread .rail :deep(.talents) {
  flex: 1 1 auto;
  min-width: 0;
}

.hero-card.spread .bottom {
  flex: none;
  padding-top: 0;
  border-top: 0;
}

@media (min-width: 1680px) {
  .hero-card.spread .columns {
    grid-template-columns: minmax(240px, 270px) minmax(280px, 1fr) minmax(250px, 300px);
    grid-template-areas: 'facts kit rail';
  }

  .hero-card.spread .rail {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding-top: 0;
    padding-left: 16px;
    border-top: 0;
    border-left: 1px solid var(--edge);
  }

  .hero-card.spread .rail :deep(.options) {
    grid-template-columns: 1fr;
  }

  .hero-card.spread .bottom {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid var(--edge);
  }
}

.equip-zone {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  padding: 16px;
  border-radius: var(--radius);
  border: 2px dashed rgba(244, 197, 91, 0.7);
  background: rgba(12, 22, 18, 0.86);
  color: var(--gold);
  font-family: var(--font-hand);
  font-size: 30px;
  line-height: 1.05;
  text-align: center;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.equip-zone.hovered {
  border-color: var(--gold);
  background: rgba(28, 40, 30, 0.94);
}

.equip-zone.blocked {
  border-color: rgba(255, 112, 96, 0.55);
  background: rgba(28, 16, 14, 0.88);
  color: var(--theirs);
}

.equip-zone.blocked.hovered {
  border-color: var(--theirs);
  background: rgba(48, 18, 16, 0.94);
}
</style>
