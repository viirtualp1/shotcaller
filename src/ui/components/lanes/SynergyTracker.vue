<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { computed } from 'vue'
import { LANE_IDS } from '@/content/ids'
import { useGameText } from '../../composables/useGameText'
import { useDragStore } from '../../stores/drag'
import { useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'
import HudPanel from '../common/HudPanel.vue'
import SynergyChip from './SynergyChip.vue'

const MAX_SUGGESTIONS = 2

const store = useMatchStore()
const drag = useDragStore()
const text = useGameText()
const { t } = text

const lanes = computed(() => {
  const view = store.view!

  return LANE_IDS.map((lane) => ({
    lane,
    ours: view.human.lanes[lane],
    theirs: view.opponent.lanes[lane],
  }))
})

const placing = computed(() => store.isPlanning && store.selectedUid !== null)
</script>

<template>
  <HudPanel :title="t('tracker.title')" data-tour="tracker">
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
        <span class="name hand">{{ text.slotName(entry.lane) }}</span>

        <div class="matchup">
          <div class="side ours">
            <TransitionGroup name="pop" tag="span" class="heroes">
              <HeroAvatar
                v-for="hero in entry.ours.heroes"
                :key="hero.uid"
                :hero-id="hero.heroId"
                :size="22"
              />
            </TransitionGroup>

            <SynergyChip v-for="id in entry.ours.report.synergies" :key="id" :synergy="id" />

            <SynergyChip
              v-for="s in entry.ours.report.suggestions.slice(0, MAX_SUGGESTIONS)"
              :key="`next-${s.synergy}`"
              :synergy="s.synergy"
              :missing="s.roles"
              :recruit="store.isPlanning ? s.recruit?.heroId : null"
              @recruit="s.recruit && store.move(s.recruit.uid, entry.lane)"
            />
          </div>

          <span class="vs">{{ t('tracker.vs') }}</span>

          <div class="side theirs">
            <TransitionGroup name="pop" tag="span" class="heroes">
              <HeroAvatar
                v-for="hero in entry.theirs.heroes"
                :key="hero.uid"
                :hero-id="hero.heroId"
                :team="1"
                :size="22"
              />
            </TransitionGroup>

            <SynergyChip v-for="id in entry.theirs.report.synergies" :key="id" :synergy="id" />
          </div>
        </div>

        <p v-if="!entry.ours.heroes.length" class="warning">
          <TriangleAlert :size="13" /> {{ t('tracker.emptyLane') }}
        </p>
      </li>
    </ul>
  </HudPanel>
</template>

<style scoped>
.lanes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lane {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px 10px;
  border-radius: 9px;
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
  font-size: 22px;
  line-height: 1;
}

.matchup {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  padding-block: 8px;
}

.side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  min-width: 0;
}

.side.theirs {
  align-items: flex-end;
}

.heroes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 22px;
}

.heroes:not(:last-child) {
  margin-bottom: 7px;
}

.theirs .heroes {
  justify-content: flex-end;
}

.vs {
  line-height: 22px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--chalk-faint);
}

.warning {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: 11px;
  color: #ffb36b;
}
</style>
