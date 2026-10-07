<script setup lang="ts">
import { computed } from 'vue'
import { LANE_STANCES } from '@/content/ids'
import { MODES } from '@/content/modes'
import { useGameText } from '../../composables/useGameText'
import { useDragStore } from '../../stores/drag'
import { useMatchStore } from '../../stores/match'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import HudPanel from '../common/HudPanel.vue'
import { ORDER_ICONS } from './orderIcons'
import FactionChip from './FactionChip.vue'
import SynergyChip from './SynergyChip.vue'

const MAX_SUGGESTIONS = 2

const store = useMatchStore()
const settings = useSettingsStore()
const drag = useDragStore()
const text = useGameText()
const { t } = text

const lanes = computed(() => {
  const view = store.view!

  return MODES[view.mode].lanes.map((lane) => {
    const ours = view.human.lanes[lane]
    const theirs = view.opponent.lanes[lane]

    return {
      lane,
      ours,
      theirs,
      ourFactions: ours.report.factions.filter((standing) => standing.tier !== null),
      /* While planning, the faction one hero short of its first step is worth a reminder. */
      nearFaction: store.isPlanning
        ? (ours.report.factions.find((standing) => standing.count === 1) ?? null)
        : null,
      theirFactions: theirs.report.factions.filter((standing) => standing.tier !== null),
    }
  })
})

const placing = computed(() => store.isPlanning && store.selectedUid !== null)
</script>

<template>
  <HudPanel data-tour="tracker">
    <ul class="lanes">
      <li
        v-for="entry in lanes"
        :key="entry.lane"
        class="lane"
        :class="{
          target: placing,
          hovered: drag.target?.kind === 'lane' && drag.target.lane === entry.lane,
        }"
        :data-drop="`lane:${entry.lane}`"
        @click="store.placeSelected(entry.lane)"
      >
        <!-- The lane's name stands between the two sides, so a lane spends no line on its title. -->
        <div class="matchup">
          <TransitionGroup name="pop" tag="span" class="heroes ours">
            <HeroAvatar
              v-for="hero in entry.ours.heroes"
              :key="hero.uid"
              :hero-id="hero.heroId"
              :role="hero.role"
              :pending="hero.pendingTalent"
              :size="34"
            />
          </TransitionGroup>

          <span class="name hand">{{ text.slotName(entry.lane) }}</span>

          <TransitionGroup name="pop" tag="span" class="heroes theirs">
            <HeroAvatar
              v-for="hero in entry.theirs.heroes"
              :key="hero.uid"
              :hero-id="hero.heroId"
              :role="hero.role"
              :team="1"
              :size="34"
            />
          </TransitionGroup>
        </div>

        <!-- Orders are given while planning; afterwards the lane just shows the one it got. -->
        <div
          v-if="settings.laneOrders && store.isPlanning"
          class="orders"
          role="group"
          :aria-label="t('orders.label')"
          @click.stop
        >
          <button
            v-for="order in LANE_STANCES"
            :key="order"
            type="button"
            class="order"
            :aria-pressed="entry.ours.stance === order"
            :title="t(`orders.${order}.hint`)"
            @click="store.setStance(entry.lane, order)"
          >
            <component :is="ORDER_ICONS[order]" :size="13" />
            {{ t(`orders.${order}.name`) }}
          </button>
        </div>

        <span v-else-if="settings.laneOrders && entry.ours.stance" class="order given">
          <component :is="ORDER_ICONS[entry.ours.stance]" :size="13" />
          {{ t(`orders.${entry.ours.stance}.name`) }}
        </span>

        <div class="chip-row">
          <div class="chips ours">
            <FactionChip v-for="f in entry.ourFactions" :key="f.faction" v-bind="f" />
            <SynergyChip v-for="id in entry.ours.report.synergies" :key="id" :synergy="id" />

            <SynergyChip
              v-for="s in entry.ours.report.suggestions.slice(0, MAX_SUGGESTIONS)"
              :key="`next-${s.synergy}`"
              :synergy="s.synergy"
              :missing="s.roles"
              :recruit="store.isPlanning ? s.recruit?.heroId : null"
              @recruit="s.recruit && store.move(s.recruit.uid, entry.lane)"
            />

            <FactionChip v-if="entry.nearFaction" v-bind="entry.nearFaction" />
          </div>

          <div class="chips theirs">
            <FactionChip v-for="f in entry.theirFactions" :key="f.faction" v-bind="f" />
            <SynergyChip v-for="id in entry.theirs.report.synergies" :key="id" :synergy="id" />
          </div>
        </div>
      </li>
    </ul>
  </HudPanel>
</template>

<style scoped>
.lanes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lane {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.03);
  transition:
    border-color 0.15s,
    background 0.15s;
}

.lane.target {
  cursor: pointer;
  border-color: rgba(244, 197, 91, 0.5);
  border-style: dashed;
}

.lane.target:hover,
.lane.hovered {
  background: rgba(244, 197, 91, 0.08);
}

.name {
  font-size: 20px;
  line-height: 34px;
  white-space: nowrap;
}

.orders {
  display: flex;
  flex-wrap: wrap;
  align-self: flex-start;
  gap: 2px;
  padding: 2px;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.25);
}

.order {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
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

.order[aria-pressed='true'],
.order.given {
  background: var(--gold);
  color: var(--ink);
}

.order.given {
  align-self: flex-start;
  cursor: default;
}

.matchup {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: start;
  gap: 10px;
}

.heroes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 34px;
}

.heroes.theirs {
  justify-content: flex-end;
}

/* Two columns under the heroes, ours left and theirs right. Each wraps its chips, so a busy lane grows wide first. */
.chip-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.chip-row:not(:has(.chip)) {
  display: none;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 6px;
  min-width: 0;
}

.chips.theirs {
  justify-content: flex-end;
}

/* With nothing on their side, ours take the whole width. */
.chips.theirs:empty {
  display: none;
}

.chip-row:has(.chips.theirs:empty) .chips.ours {
  grid-column: 1 / -1;
}
</style>
