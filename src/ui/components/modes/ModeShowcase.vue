<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { MODE_IDS, type ModeId } from '@/content/ids'
import { MODES, TUTORIAL_MODE } from '@/content/modes'
import { rankFor } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import { useMenuStore } from '../../stores/menu'
import { useProfileStore } from '../../stores/profile'
import { useSettingsStore } from '../../stores/settings'
import { useTutorial } from '../../tutorial/useTutorial'
import RankMedal from '../profile/RankMedal.vue'
import ModeMap from './ModeMap.vue'

/** The start screen without a saved match: the three modes, each with the coach's rank in it. */
const menu = useMenuStore()
const profile = useProfileStore()
const settings = useSettingsStore()
const tour = useTutorial()
const text = useGameText()
const { t } = text

/** A new coach is pointed at the tutorial's mode first; the others come after it. */
const groups = computed(() =>
  tour.completed.value
    ? [
        {
          key: 'all',
          title: t('modes.pick'),
          modes: MODE_IDS,
        },
      ]
    : [
        {
          key: 'first',
          title: t('modes.startHere'),
          modes: [TUTORIAL_MODE],
        },
        {
          key: 'others',
          title: t('modes.others'),
          modes: MODE_IDS.filter((id) => id !== TUTORIAL_MODE),
        },
      ],
)

function pick(mode: ModeId) {
  settings.mode = mode
  menu.newMatch = true
}
</script>

<template>
  <section class="showcase">
    <template v-for="group in groups" :key="group.key">
      <h2 class="eyebrow">{{ group.title }}</h2>

      <ul class="cards" :class="group.key">
        <li v-for="(id, i) in group.modes" :key="id" :style="{ '--delay': `${i * 60}ms` }">
          <button type="button" class="card" @click="pick(id)">
            <ModeMap :mode="id" :size="84" />

            <span class="about">
              <strong class="name">{{ t(`modes.${id}.name`) }}</strong>
              <span class="text">{{ t(`modes.${id}.text`) }}</span>

              <span class="facts">
                {{ t('modes.facts', { rounds: MODES[id].maxRounds, heroes: MODES[id].levels[0]!.board }) }}
              </span>
            </span>

            <span class="rank" :title="t('modes.yourRating')">
              <RankMedal
                :tier="rankFor(profile.profile.ratings[id]).tier"
                :stars="rankFor(profile.profile.ratings[id]).stars"
                :size="34"
              />

              <span class="rating">{{ text.number(profile.profile.ratings[id]) }}</span>
            </span>

            <ChevronRight :size="18" class="chevron" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.showcase {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.eyebrow {
  margin: 0;
}

.cards + .eyebrow {
  margin-top: 8px;
}

.cards.first .card {
  border-color: rgba(244, 197, 91, 0.45);
  background: linear-gradient(90deg, rgba(244, 197, 91, 0.08), var(--panel) 60%);
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cards li {
  animation: slide-in 0.34s var(--delay) ease-out both;
}

.card {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 12px 14px 12px 12px;
  border: 1px solid var(--edge);
  border-radius: 16px;
  background: var(--panel);
  color: var(--chalk);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s,
    transform 0.15s;
}

.card:hover,
.card:focus-visible {
  border-color: var(--gold);
  transform: translateX(3px);
}

.about {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.name {
  font-size: 17px;
}

.text {
  font-size: 13px;
  color: var(--chalk-dim);
}

.facts {
  font-size: 12px;
  color: var(--chalk-faint);
}

.rank {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.rating {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--chalk-dim);
}

.chevron {
  color: var(--chalk-faint);
}

@media (max-width: 480px) {
  .card {
    gap: 10px;
  }

  .card :deep(.mode-map) {
    width: 56px;
    height: 56px;
  }

  .chevron {
    display: none;
  }
}
</style>
