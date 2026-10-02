<script setup lang="ts">
import { computed } from 'vue'
import type { TeamId } from '@/content/ids'
import { useGameText } from '../../../composables/useGameText'
import HeroAvatar from '../../common/HeroAvatar.vue'
import { HERO_COLUMNS, type HeroStatKey, type HeroStatRow } from './reportModel'

const props = withDefaults(
  defineProps<{
    heroes: readonly HeroStatRow[]
    team: TeamId
    topDamage: number
    columns?: readonly HeroStatKey[]
  }>(),
  { columns: () => HERO_COLUMNS },
)

const sort = defineModel<HeroStatKey>('sort', { required: true })

const text = useGameText()
const { t } = text

const rows = computed(() =>
  props.heroes.filter((h) => h.team === props.team).sort((a, b) => b[sort.value] - a[sort.value]),
)

/** Heroes the team fielded more than once: their lines name the lane, so the copies can be told apart. */
const twins = computed(() => {
  const seen = new Set<HeroStatRow['heroId']>()
  const repeated = new Set<HeroStatRow['heroId']>()

  for (const row of rows.value) {
    if (seen.has(row.heroId)) {
      repeated.add(row.heroId)
    }

    seen.add(row.heroId)
  }

  return repeated
})

function nameOf(row: HeroStatRow) {
  const name = text.heroName(row.heroId)

  return twins.value.has(row.heroId) && row.lane ? `${name} · ${text.slotName(row.lane)}` : name
}
</script>

<template>
  <section class="team" :class="team === 0 ? 'ours' : 'theirs'">
    <h3 class="eyebrow">{{ team === 0 ? t('report.ours') : t('report.theirs') }}</h3>

    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th scope="col" class="hero-col">{{ t('report.columns.hero') }}</th>

            <th
              v-for="key in columns"
              :key="key"
              scope="col"
              :aria-sort="sort === key ? 'descending' : 'none'"
            >
              <button
                type="button"
                class="sort"
                :class="{ active: sort === key }"
                :title="t(`report.hints.${key}`)"
                @click="sort = key"
              >
                {{ t(`report.columns.${key}`) }}
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(hero, index) in rows" :key="`${hero.heroId}-${index}`">
            <th scope="row" class="hero-col">
              <span class="hero">
                <HeroAvatar :hero-id="hero.heroId" :team="team" :stars="hero.bestStars" :size="28" />
                <span class="name">{{ nameOf(hero) }}</span>
              </span>
            </th>

            <td v-for="key in columns" :key="key" :class="{ active: sort === key }">
              <span v-if="key === 'damageDealt'" class="bar">
                <i :style="{ width: `${(hero.damageDealt / topDamage) * 100}%` }" />
              </span>

              <span class="value">{{ text.number(hero[key]) }}</span>
            </td>
          </tr>

          <tr v-if="!rows.length">
            <td :colspan="columns.length + 1" class="empty">{{ t('report.noHeroes') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.team {
  --team: var(--ours);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.team.theirs {
  --team: var(--theirs);
}

.eyebrow {
  color: var(--team);
}

.scroll {
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: var(--radius);
  border: 1px solid var(--edge);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}

th,
td {
  padding: 8px 8px 10px;
  text-align: right;
  white-space: nowrap;
}

thead th {
  background: rgba(0, 0, 0, 0.25);
  font-weight: 600;
}

tbody tr + tr {
  border-top: 1px solid var(--edge);
}

tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.hero-col {
  text-align: left;
  font-weight: 600;
}

.hero {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.sort {
  padding: 0;
  border: 0;
  background: none;
  color: var(--chalk-dim);
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.sort:hover,
.sort.active {
  color: var(--gold);
}

td.active {
  color: var(--chalk);
  font-weight: 700;
}

td {
  position: relative;
  color: var(--chalk-dim);
}

.bar {
  position: absolute;
  inset: 6px 10px;
  border-radius: 4px;
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  margin-left: auto;
  background: color-mix(in srgb, var(--team) 30%, transparent);
}

.value {
  position: relative;
}

.empty {
  text-align: center;
  color: var(--chalk-faint);
}
</style>
