<script setup lang="ts">
import { computed } from 'vue'
import { HEROES } from '@/content/heroes'
import type { RoleId } from '@/content/ids'
import { heroesByPlays } from '@/domain/profile/Profile'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import HeroAvatar from '../common/HeroAvatar.vue'
import HudPanel from '../common/HudPanel.vue'
import { winRate } from './format'

const SHOWN = 8

type RoleStat = 'structureDamage' | 'healing'

/** Every hero hits buildings, so that column is always there; supports are also judged by their healing. */
const ROLE_STATS: Partial<Record<RoleId, RoleStat>> = {
  support: 'healing',
}

const SHARED_STATS: readonly RoleStat[] = ['structureDamage']
const COLUMN_ORDER: readonly RoleStat[] = ['structureDamage', 'healing']

/** Over all matches, with the average under it; matches recorded before a stat existed do not count toward it. */
interface Summed {
  readonly total: number
  readonly perMatch: number
}

const summed = (total: number, matches: number): Summed | null =>
  matches
    ? {
        total,
        perMatch: Math.round(total / matches),
      }
    : null

const profile = useProfileStore()
const text = useGameText()
const { t } = text

const rows = computed(() =>
  heroesByPlays(profile.profile)
    .slice(0, SHOWN)
    .map(([heroId, hero]) => ({
      heroId,
      hero,
      winRate: winRate(hero.wins, hero.matches),
      damage: summed(hero.damage, hero.matches),
      roleStat: ROLE_STATS[HEROES[heroId].role] ?? null,
    })),
)

type Row = (typeof rows.value)[number]

const shows = (row: Row, stat: RoleStat) => SHARED_STATS.includes(stat) || row.roleStat === stat

/** Buildings for everyone, plus a column for each role stat some listed hero is judged by. */
const roleColumns = computed(() => COLUMN_ORDER.filter((stat) => rows.value.some((row) => shows(row, stat))))

const roleValue = (row: Row, stat: RoleStat) =>
  shows(row, stat) ? summed(row.hero[stat], row.hero.detailed) : null
</script>

<template>
  <HudPanel :title="t('profile.heroes.title')" class="panel">
    <table v-if="rows.length">
      <thead>
        <tr>
          <th scope="col">{{ t('profile.heroes.hero') }}</th>
          <th scope="col" class="num">{{ t('profile.heroes.matches') }}</th>
          <th scope="col">{{ t('profile.heroes.winRate') }}</th>
          <th scope="col" class="num extra">{{ t('profile.heroes.kd') }}</th>

          <th scope="col" class="num extra" :title="t('profile.heroes.totalHint')">
            {{ t('profile.heroes.damage') }}
          </th>

          <th
            v-for="stat in roleColumns"
            :key="stat"
            scope="col"
            class="num extra"
            :title="t('profile.heroes.totalHint')"
          >
            {{ t(`profile.heroes.${stat}`) }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="row in rows" :key="row.heroId">
          <th scope="row">
            <span class="hero">
              <HeroAvatar :hero-id="row.heroId" :stars="row.hero.bestStars" :size="30" />
              {{ text.heroName(row.heroId) }}
            </span>
          </th>

          <td class="num">{{ text.number(row.hero.matches) }}</td>

          <td>
            <span class="rate">
              <span class="bar"><span class="fill" :style="{ width: `${row.winRate}%` }" /></span>
              {{ row.winRate }}%
            </span>
          </td>

          <td class="num extra">{{ text.number(row.hero.kills) }} / {{ text.number(row.hero.deaths) }}</td>

          <td class="num extra">
            <template v-if="row.damage">
              <span class="total">{{ text.number(row.damage.total) }}</span>

              <span class="avg">{{
                t('profile.heroes.perMatchShort', { n: text.number(row.damage.perMatch) })
              }}</span>
            </template>
          </td>

          <td v-for="stat in roleColumns" :key="stat" class="num extra" :class="{ muted: !shows(row, stat) }">
            <template v-if="roleValue(row, stat)">
              <span class="total">{{ text.number(roleValue(row, stat)!.total) }}</span>

              <span class="avg">
                {{ t('profile.heroes.perMatchShort', { n: text.number(roleValue(row, stat)!.perMatch) }) }}
              </span>
            </template>

            <template v-else>—</template>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else class="empty">{{ t('profile.heroes.empty') }}</p>
  </HudPanel>
</template>

<style scoped>
.total {
  display: block;
}

.avg {
  display: block;
  font-size: 11px;
  color: var(--chalk-faint);
}

.panel {
  padding: 16px 18px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

th,
td {
  padding: 7px 8px;
  text-align: left;
  white-space: nowrap;
}

thead th {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chalk-faint);
  border-bottom: 1px solid var(--edge);
}

tbody tr + tr {
  border-top: 1px solid rgba(236, 232, 220, 0.06);
}

tbody th {
  font-weight: 700;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.hero {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 6px;
}

.rate {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}

.bar {
  position: relative;
  width: 64px;
  height: 5px;
  border-radius: 999px;
  background: rgba(236, 232, 220, 0.1);
  overflow: hidden;
}

.fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: var(--heal);
}

.empty {
  margin: 0;
  color: var(--chalk-dim);
}

.muted {
  color: var(--chalk-faint);
}

@media (max-width: 560px) {
  .extra,
  .bar {
    display: none;
  }

  th,
  td {
    padding-inline: 6px;
  }
}
</style>
