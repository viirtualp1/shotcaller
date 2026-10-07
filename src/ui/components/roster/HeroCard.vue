<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { ChevronDown, ChevronUp, Coins, Link2, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { previewHeroVitals } from '@/application/heroVitals'
import { HEROES } from '@/content/heroes'
import { ITEM_SLOTS } from '@/content/items'
import { ROLES } from '@/content/roles'
import { SYNERGY_BY_ID } from '@/content/synergies'
import { heroCanEquip } from '@/domain/items/Stash'
import { heroSheet } from '@/domain/roster/heroSheet'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { useLiveHeroVitals } from '../../composables/useLiveHeroVitals'
import { ADAPTIVE_ICON, ROLE_ICONS } from '../../icons'
import { useBoardStore } from '../../stores/board'
import { useDragStore } from '../../stores/drag'
import { loadoutOf, useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'
import HeroDetails from '../common/HeroDetails.vue'
import HeroResources from '../common/HeroResources.vue'
import InfoTooltip from '../common/InfoTooltip.vue'
import ItemDetails from '../common/ItemDetails.vue'
import ItemIcon from '../common/ItemIcon.vue'
import AbilityBar from './AbilityBar.vue'
import HeroStatStrip from './HeroStatStrip.vue'
import TalentPicker from './TalentPicker.vue'

/** Presses that keep the card open: the card itself and everything that acts on the selected hero. */
const KEEP_OPEN =
  '.hero-card, [data-drop^="lane:"], [data-drop^="hero:"], [data-drop="bench"], [data-stash-item]'

/**
 * A unit panel in the manner of Dota and Underlords: who the hero is, its numbers and ability at a glance, items and
 * selling at hand. Meanings wait in tooltips, and the full sheet opens on request. `docked`: inside a short panel.
 */
withDefaults(defineProps<{ docked?: boolean }>(), {
  docked: false,
})

const store = useMatchStore()
const board = useBoardStore()
const drag = useDragStore()
const text = useGameText()
const { t } = text

/** Stays open from hero to hero, like a panel the coach pulled out, and folds when the card closes. */
const expanded = ref(false)

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

const sheet = computed(() => (loadout.value ? heroSheet(loadout.value) : null))
const heroVitals = computed(() => vitals.value ?? (loadout.value ? previewHeroVitals(loadout.value) : null))

/** The one moment talents need the coach: a fresh ★★ hero of their own during planning. */
const choosingTalent = computed(
  () => canManage.value && located.value?.hero.stars === 2 && located.value.hero.talent === undefined,
)

const role = computed(() => {
  const hero = located.value?.hero

  if (!hero) {
    return null
  }

  const played = hero.role ?? HEROES[hero.heroId].role
  /** An adaptive hero off the lanes has no role yet: it shows the mask and how it picks one. */
  const undecided = Boolean(HEROES[hero.heroId].adaptive && !hero.role)

  return {
    icon: undecided ? ADAPTIVE_ICON : ROLE_ICONS[played],
    color: cssColor(ROLES[played].color),
    name: text.heroRoleName(hero.heroId, hero.role),
    passive: undecided ? t('roles.adaptive.passive') : text.rolePassive(played),
  }
})

const synergies = computed(() =>
  (loadout.value?.synergies ?? []).map((id) => ({
    id,
    color: cssColor(SYNERGY_BY_ID[id].color),
    name: text.synergyName(id),
    effect: text.synergyEffect(id),
  })),
)

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

watch(located, (hero) => {
  if (!hero) {
    expanded.value = false
  }
})

useEventListener(document, 'pointerdown', closeOnOutsidePress, { capture: true })
</script>

<template>
  <Transition name="card">
    <aside
      v-if="located && loadout && sheet"
      :key="located.hero.uid"
      class="hero-card"
      :class="{ enemy, docked, expanded }"
      :style="{ '--hero': accent }"
      aria-live="polite"
    >
      <header class="head">
        <HeroAvatar
          :hero-id="located.hero.heroId"
          :stars="located.hero.stars"
          :team="enemy ? 1 : 0"
          :size="48"
        />

        <div class="who">
          <div class="title">
            <strong class="name">{{ text.heroName(located.hero.heroId) }}</strong>
            <span v-if="enemy" class="side">{{ t('card.enemy') }}</span>

            <InfoTooltip v-if="role" side="top" clickable>
              <button type="button" class="trait role" :style="{ '--trait': role.color }">
                <component :is="role.icon" :size="13" aria-hidden="true" />
                {{ role.name }}
              </button>

              <template #content>
                <strong class="tip-title">{{ t('card.rolePassive', { role: role.name }) }}</strong>
                <span class="tip-text">{{ role.passive }}</span>
              </template>
            </InfoTooltip>

            <InfoTooltip v-for="synergy in synergies" :key="synergy.id" side="top" clickable>
              <button
                type="button"
                class="trait synergy"
                :style="{ '--trait': synergy.color }"
                :aria-label="t('card.synergy', { name: synergy.name })"
              >
                <Link2 :size="13" aria-hidden="true" />
              </button>

              <template #content>
                <strong class="tip-title">{{ t('card.synergy', { name: synergy.name }) }}</strong>
                <span class="tip-text">{{ synergy.effect }}</span>
              </template>
            </InfoTooltip>
          </div>

          <HeroResources v-if="heroVitals" :values="heroVitals" compact />
        </div>

        <button type="button" class="close" :aria-label="t('card.close')" @click="store.clearSelection()">
          <X :size="14" />
        </button>
      </header>

      <div v-if="!expanded" class="kit">
        <HeroStatStrip :sheet="sheet" :hero-id="located.hero.heroId" :stars="located.hero.stars" />

        <AbilityBar
          :hero-id="located.hero.heroId"
          :stars="located.hero.stars"
          :sheet="sheet"
          :role="located.hero.role"
          :talent="located.hero.talent"
        />
      </div>

      <HeroDetails
        v-else
        class="details"
        v-bind="loadout"
        :heading="false"
        :resource-bars="false"
        :item-icons="false"
      />

      <TalentPicker
        v-if="choosingTalent || expanded"
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
                <ItemIcon :item-id="slot.itemId" :size="38" />
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

        <button
          v-if="!enemy"
          type="button"
          class="btn danger sell"
          :disabled="!store.isPlanning"
          title="E"
          @click="store.sell(located.hero.uid)"
        >
          <Coins :size="15" />
          {{ t('card.sell', { gold: located.hero.sellValue }) }}
        </button>
      </footer>

      <button type="button" class="more" :aria-expanded="expanded" @click="expanded = !expanded">
        {{ expanded ? t('card.lessDetails') : t('card.moreDetails') }}
        <ChevronUp v-if="expanded" :size="14" aria-hidden="true" />
        <ChevronDown v-else :size="14" aria-hidden="true" />
      </button>

      <Transition name="fade">
        <div
          v-if="equipping"
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
/* A card for another hero fades in over the old one; the old one leaves the layout so nothing jumps. */
.card-enter-active {
  transition:
    opacity 0.18s ease-out,
    transform 0.18s ease-out;
}

.hero-card.card-leave-active {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  transition: opacity 0.12s ease-in;
}

.card-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.card-leave-to {
  opacity: 0;
}

.hero-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border-radius: var(--radius);
  background: rgba(17, 24, 21, 0.96);
  border: 1px solid rgba(244, 197, 91, 0.45);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  pointer-events: auto;
}

/* Docked in a panel instead of floating: no shadow over the dock. */
.hero-card.docked {
  box-shadow: none;
}

.hero-card.enemy {
  border-color: rgba(255, 112, 96, 0.5);
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: -12px -12px 0;
  padding: 10px 12px;
  border-radius: var(--radius) var(--radius) 0 0;
  border-bottom: 1px solid var(--edge);
  background: linear-gradient(90deg, color-mix(in srgb, var(--hero) 22%, transparent), transparent 70%);
}

/* A scrolling full sheet keeps who it belongs to and the way back in view. */
.hero-card.expanded .head,
.hero-card.expanded .more {
  position: sticky;
  z-index: 2;
}

.hero-card.expanded .head {
  top: -12px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--hero) 22%, transparent), transparent 70%), rgb(17, 24, 21);
}

.hero-card.expanded .more {
  bottom: -12px;
  background: rgb(22, 29, 26);
}

.who {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  min-width: 0;
  padding-right: 22px;
}

.name {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side {
  flex: none;
  order: 1;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--theirs);
}

.trait {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 7px;
  border: 1px solid color-mix(in srgb, var(--trait) 45%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--trait) 12%, transparent);
  color: var(--chalk);
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: help;
}

.trait svg {
  flex: none;
  color: var(--trait);
}

.trait.synergy {
  width: 22px;
  padding: 0;
  justify-content: center;
}

/* A quiet cross: a press outside the card or Esc closes it too. */
.close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--chalk-faint);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.close:hover,
.close:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  color: var(--chalk);
}

/* Attributes on the left, the ability and its talents on the right, as on a Dota hero panel. */
.kit {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tip-title {
  display: block;
}

.tip-text {
  color: var(--chalk-dim);
}

.details {
  width: auto;
}

.bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.items {
  display: flex;
  gap: 6px;
}

.slot {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
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

.sell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.danger:hover:not(:disabled) {
  border-color: var(--theirs);
  color: var(--theirs);
}

/* The fold sits at the very bottom, so on a card pinned to the screen edge it never moves under the pointer. */
.more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: -2px -12px -12px;
  padding: 5px 12px;
  border: 0;
  border-top: 1px solid var(--edge);
  border-radius: 0 0 var(--radius) var(--radius);
  background: rgba(255, 255, 255, 0.03);
  color: var(--chalk-dim);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.more:hover,
.more:focus-visible {
  background: rgba(255, 255, 255, 0.07);
  color: var(--chalk);
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
