<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { computed } from 'vue'
import { LANE_IDS, ROLE_IDS, type SynergyId } from '@/content/ids'
import { SYNERGY_BY_ID } from '@/content/synergies'
import type { SynergySuggestion } from '@/domain/synergy/resolveLane'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { useDragStore } from '../../stores/drag'
import { useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'
import HudPanel from '../common/HudPanel.vue'
import InfoTooltip from '../common/InfoTooltip.vue'

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
    enemies: view.opponent.lanes[lane].heroes.length,
  }))
})

const synergyColor = (id: SynergyId) => cssColor(SYNERGY_BY_ID[id].color)

function suggestionLabel(s: SynergySuggestion): string {
  const who =
    s.roles.length === ROLE_IDS.length
      ? t('tracker.anyHero')
      : s.roles.map((r) => text.roleName(r)).join(t('tracker.or'))
  return t('tracker.add', { who })
}

const placing = computed(() => store.isPlanning && store.selectedUid !== null)
</script>

<template>
  <HudPanel :title="t('tracker.title')" data-tour="tracker">
    <ul class="lanes">
      <li
        v-for="entry in lanes"
        :key="entry.lane"
        class="lane"
        :class="{ target: placing, hovered: drag.target?.kind === 'lane' && drag.target.lane === entry.lane }"
        :data-drop="`lane:${entry.lane}`"
        @click="store.placeSelected(entry.lane)"
      >
        <div class="row">
          <span class="name hand">{{ text.slotName(entry.lane) }}</span>
          <TransitionGroup name="pop" tag="span" class="heroes">
            <HeroAvatar v-for="hero in entry.ours.heroes" :key="hero.uid" :hero-id="hero.heroId" :size="22" />
          </TransitionGroup>
          <span class="versus" :title="t('teams.theirs')"
            >{{ entry.ours.heroes.length }}:{{ entry.enemies }}</span
          >
        </div>
        <div class="chips">
          <InfoTooltip v-for="id in entry.ours.report.synergies" :key="id" side="right">
            <span class="chip active anim-pop" :style="{ '--c': synergyColor(id) }">{{
              text.synergyName(id)
            }}</span>
            <template #content>
              <strong>{{ text.synergyName(id) }}</strong> · {{ text.synergyNeed(id) }}
              <div>{{ text.synergyEffect(id) }}</div>
            </template>
          </InfoTooltip>
          <InfoTooltip
            v-for="s in entry.ours.report.suggestions.slice(0, MAX_SUGGESTIONS)"
            :key="`next-${s.synergy}`"
            side="right"
          >
            <span class="chip next anim-pop">
              {{ suggestionLabel(s) }} → {{ text.synergyName(s.synergy) }}
            </span>
            <template #content>
              <strong>{{ text.synergyName(s.synergy) }}</strong> · {{ text.synergyNeed(s.synergy) }}
              <div>{{ text.synergyEffect(s.synergy) }}</div>
            </template>
          </InfoTooltip>
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
  gap: 5px;
  padding: 6px 8px;
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

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-size: 22px;
  line-height: 1;
  min-width: 46px;
}

.heroes {
  display: flex;
  gap: 5px;
  flex: 1;
  min-height: 22px;
}

.versus {
  font-size: 11px;
  color: var(--chalk-faint);
  font-variant-numeric: tabular-nums;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  cursor: help;
}

.chip.active {
  color: var(--ink);
  background: var(--c);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c) 45%, transparent);
}

.chip.next {
  color: var(--chalk-dim);
  border: 1px dashed var(--edge-strong);
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
