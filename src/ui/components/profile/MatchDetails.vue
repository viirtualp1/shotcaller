<script setup lang="ts">
import { Crown, LayoutGrid, Swords, Users } from 'lucide-vue-next'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { computed, ref } from 'vue'
import type { ModeId, TeamId } from '@/content/ids'
import { MODES } from '@/content/modes'
import {
  hasDetails,
  isRated,
  type LineupHero,
  type MatchHeroLine,
  type MatchRecord,
} from '@/domain/profile/Profile'
import type { RoundPick } from '@/domain/match/matchStats'
import { resolveLane } from '@/domain/synergy/resolveLane'
import { useGameText } from '../../composables/useGameText'
import HeroAvatar from '../common/HeroAvatar.vue'
import ItemIcon from '../common/ItemIcon.vue'
import HeroStatsTable from '../dialogs/report/HeroStatsTable.vue'
import StatComparison from '../dialogs/report/StatComparison.vue'
import {
  HERO_COLUMNS,
  type ComparisonRow,
  type HeroStatKey,
  type HeroStatRow,
} from '../dialogs/report/reportModel'
import SynergyChip from '../lanes/SynergyChip.vue'

/** Older matches kept only these per hero. */
const BASIC_COLUMNS: readonly HeroStatKey[] = ['kills', 'deaths', 'damageDealt']

interface Tile {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly note?: string
  readonly tone?: 'up' | 'down'
}

/** Totals, heroes, lineups and the fight of one match; keyed by the match, so switching resets the tabs. */
const props = defineProps<{
  match: MatchRecord
}>()

const text = useGameText()
const { t } = text

const tab = ref('heroes')
const sort = ref<HeroStatKey>('damageDealt')

/** A round picked to look at; null shows the lineups the match ended with. */
const round = ref<number | null>(null)

const roundLineups = computed(() => props.match.roundLineups)
const detailed = computed(() => hasDetails(props.match))
const columns = computed(() => (detailed.value ? HERO_COLUMNS : BASIC_COLUMNS))

const tiles = computed((): Tile[] => {
  const record = props.match
  const delta = record.ratingAfter - record.ratingBefore

  const rating: Tile[] = [
    {
      key: 'rating',
      label: t('matchDetails.rating'),
      value: text.signed(delta),
      note: `${text.number(record.ratingBefore)} → ${text.number(record.ratingAfter)}`,
      tone: delta > 0 ? 'up' : delta < 0 ? 'down' : undefined,
    },
  ]

  return [
    ...(isRated(record) ? rating : []),
    {
      key: 'xp',
      label: t('profile.progress.xp'),
      value: `+${text.number(record.xp)}`,
    },
    {
      key: 'rounds',
      label: t('matchDetails.rounds'),
      value: `${record.roundsWon}–${record.roundsLost}`,
      note: t('profile.stats.rounds', { n: record.rounds }, record.rounds),
    },
    {
      key: 'kills',
      label: t('report.combat.heroKills'),
      value: text.number(record.heroKills),
    },
    {
      key: 'towers',
      label: t('report.combat.towersDestroyed'),
      value: text.number(record.towersDestroyed),
    },
    {
      key: 'gold',
      label: t('report.economy.goldEarned'),
      value: text.number(record.goldEarned),
    },
  ]
})

const rowsOf = (lines: readonly MatchHeroLine[], team: TeamId): HeroStatRow[] =>
  lines.map((line) => ({
    team,
    heroId: line.heroId,
    bestStars: line.stars,
    rounds: line.rounds,
    kills: line.kills,
    deaths: line.deaths,
    lastHits: line.lastHits,
    damageDealt: line.damage,
    structureDamage: line.structureDamage,
    damageReceived: line.damageReceived,
    healing: line.healing,
  }))

const heroes = computed(() => [...rowsOf(props.match.heroes, 0), ...rowsOf(props.match.opponentHeroes, 1)])

const topDamage = computed(() => Math.max(1, ...heroes.value.map((h) => h.damageDealt)))

const lanesOf = (lineup: readonly LineupHero[], mode: ModeId) =>
  MODES[mode].lanes.map((lane) => ({
    lane,
    heroes: lineup.filter((hero) => hero.lane === lane),
  }))

const fromPicks = (picks: readonly RoundPick[]): LineupHero[] =>
  picks.map(([heroId, stars, lane, items]) => ({
    heroId,
    stars,
    lane,
    items,
  }))

const synergiesOf = (lineup: readonly LineupHero[], mode: ModeId) => [
  ...new Set(
    MODES[mode].lanes.flatMap(
      (lane) =>
        resolveLane(
          lane,
          lineup.filter((hero) => hero.lane === lane).map((hero) => hero.heroId),
          mode,
        ).synergies,
    ),
  ),
]

/** Both teams as the picked round saw them, or as the match ended. */
const sides = computed(() => {
  const record = props.match
  const picked = round.value === null ? undefined : record.roundLineups[round.value - 1]
  const ourLineup = picked ? fromPicks(picked[0]) : record.lineup
  const theirLineup = picked ? fromPicks(picked[1]) : record.opponentLineup

  const ours = {
    team: 0 as const,
    title: t('report.ours'),
    lanes: lanesOf(ourLineup, record.mode),
    synergies: picked ? synergiesOf(ourLineup, record.mode) : record.synergies,
  }

  if (!theirLineup.length) {
    return [ours]
  }

  return [
    ours,
    {
      team: 1 as const,
      title: t('report.theirs'),
      lanes: lanesOf(theirLineup, record.mode),
      synergies: picked ? synergiesOf(theirLineup, record.mode) : record.opponentSynergies,
    },
  ]
})

const total = (lines: readonly MatchHeroLine[], pick: (line: MatchHeroLine) => number) =>
  lines.reduce((sum, line) => sum + pick(line), 0)

const combat = computed<ComparisonRow[]>(() => {
  const record = props.match

  const compare = (key: string, label: string, pick: (line: MatchHeroLine) => number): ComparisonRow => ({
    key,
    label,
    values: [total(record.heroes, pick), total(record.opponentHeroes, pick)],
  })

  return [
    {
      key: 'rounds',
      label: t('report.combat.roundsWon'),
      values: [record.roundsWon, record.roundsLost],
    },
    compare('kills', t('report.combat.heroKills'), (line) => line.kills),
    compare('lastHits', t('report.combat.creepKills'), (line) => line.lastHits),
    compare('damage', t('report.combat.heroDamage'), (line) => line.damage),
    compare('received', t('report.combat.damageReceived'), (line) => line.damageReceived),
    compare('healing', t('report.combat.healing'), (line) => line.healing),
    compare('structures', t('matchDetails.structureDamage'), (line) => line.structureDamage),
  ]
})
</script>

<template>
  <div class="match-body">
    <section class="tiles">
      <article v-for="tile in tiles" :key="tile.key" class="tile">
        <span class="tile-label">{{ tile.label }}</span>
        <strong class="tile-value" :class="tile.tone">{{ tile.value }}</strong>
        <span v-if="tile.note" class="tile-note">{{ tile.note }}</span>
      </article>
    </section>

    <TabsRoot v-model="tab" class="tabs">
      <TabsList class="tab-list" :aria-label="t('report.title')">
        <TabsTrigger value="heroes" class="tab">
          <Users :size="15" /> {{ t('report.tabs.heroes') }}
        </TabsTrigger>

        <TabsTrigger value="lineups" class="tab">
          <LayoutGrid :size="15" /> {{ t('matchDetails.tabs.lineups') }}
        </TabsTrigger>

        <TabsTrigger v-if="detailed" value="combat" class="tab">
          <Swords :size="15" /> {{ t('report.tabs.combat') }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="heroes" class="panel">
        <HeroStatsTable
          v-model:sort="sort"
          :heroes="heroes"
          :team="0"
          :top-damage="topDamage"
          :columns="columns"
        />

        <HeroStatsTable
          v-if="detailed"
          v-model:sort="sort"
          :heroes="heroes"
          :team="1"
          :top-damage="topDamage"
          :columns="columns"
        />
      </TabsContent>

      <TabsContent value="lineups" class="panel">
        <section v-if="match.history.length" class="round-by-round">
          <h3 class="eyebrow">{{ t('matchDetails.roundByRound') }}</h3>

          <nav class="pips" :aria-label="t('matchDetails.roundByRound')">
            <button
              v-if="roundLineups.length"
              type="button"
              class="pip final"
              :aria-pressed="round === null"
              @click="round = null"
            >
              {{ t('matchDetails.final') }}
            </button>

            <button
              v-for="(verdict, i) in match.history"
              :key="i"
              type="button"
              class="pip"
              :class="verdict"
              :aria-pressed="round === i + 1"
              :disabled="!roundLineups[i]"
              :title="t(`summary.${verdict}`, { round: i + 1 })"
              @click="round = i + 1"
            >
              {{ i + 1 }}
            </button>
          </nav>
        </section>

        <!-- Older matches kept less: no opponent before 7.4, no rounds before 8.0. -->
        <p v-if="!roundLineups.length" class="legacy">
          {{ detailed ? t('matchDetails.noRounds') : t('matchDetails.legacy') }}
        </p>

        <section
          v-for="side in sides"
          :key="side.team"
          class="side"
          :class="side.team === 0 ? 'ours' : 'theirs'"
        >
          <h3 class="eyebrow">{{ side.title }}</h3>

          <div class="lanes">
            <div v-for="{ lane, heroes: picks } in side.lanes" :key="lane" class="lane">
              <span class="lane-name">{{ text.slotName(lane) }}</span>

              <ul v-if="picks.length" class="picks">
                <li v-for="(pick, i) in picks" :key="i" class="pick">
                  <span class="portrait">
                    <Crown
                      v-if="side.team === 0 && pick.heroId === match.mvp"
                      :size="12"
                      class="crown"
                      :aria-label="t('profile.history.mvp')"
                    />

                    <HeroAvatar :hero-id="pick.heroId" :team="side.team" :stars="pick.stars" :size="34" />
                  </span>

                  <span class="pick-name">{{ text.heroName(pick.heroId) }}</span>

                  <span v-if="pick.items.length" class="items">
                    <ItemIcon
                      v-for="(item, j) in pick.items"
                      :key="j"
                      :item-id="item"
                      :size="20"
                      :title="text.itemName(item)"
                    />
                  </span>
                </li>
              </ul>

              <span v-else class="empty-lane">{{ t('matchDetails.emptyLane') }}</span>
            </div>
          </div>

          <div v-if="side.synergies.length" class="synergies">
            <SynergyChip v-for="id in side.synergies" :key="id" :synergy="id" />
          </div>
        </section>
      </TabsContent>

      <TabsContent v-if="detailed" value="combat" class="panel">
        <div class="sides">
          <span class="ours">{{ t('report.ours') }}</span>
          <span class="theirs">{{ t('report.theirs') }}</span>
        </div>

        <StatComparison :rows="combat" />
      </TabsContent>
    </TabsRoot>
  </div>
</template>

<style scoped>
.match-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--edge);
}

.tile-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.tile-value {
  font-size: 22px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.tile-value.up {
  color: var(--heal);
}

.tile-value.down {
  color: var(--theirs);
}

.tile-note {
  font-size: 11.5px;
  color: var(--chalk-faint);
  font-variant-numeric: tabular-nums;
}

.round-by-round {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.round-by-round .eyebrow {
  margin: 0;
}

.pips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pip.final {
  width: auto;
  padding: 0 8px;
}

.pip[aria-pressed='true'] {
  outline: 2px solid var(--gold);
  outline-offset: 1px;
}

button.pip {
  padding: 0;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
}

button.pip:disabled {
  cursor: default;
  opacity: 0.6;
}

.pip {
  --verdict: var(--chalk-faint);
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--verdict) 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--verdict) 60%, transparent);
  color: var(--chalk);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.pip.win {
  --verdict: var(--heal);
}

.pip.loss {
  --verdict: var(--theirs);
}

.legacy {
  margin: 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 12.5px;
  color: var(--chalk-dim);
}

.tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tab-list {
  display: flex;
  gap: 4px;
  align-self: center;
  width: min(520px, 100%);
  padding: 3px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
}

.tab {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 14px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--chalk-dim);
  font-weight: 600;
  cursor: pointer;
}

.tab[data-state='active'] {
  background: var(--panel-raised);
  color: var(--chalk);
  box-shadow: inset 0 0 0 1px var(--edge-strong);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.side {
  --team: var(--ours);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.side.theirs {
  --team: var(--theirs);
}

.side .eyebrow {
  margin: 0;
  color: var(--team);
}

.lanes {
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  border: 1px solid var(--edge);
}

.lane {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
}

.lane + .lane {
  border-top: 1px solid var(--edge);
}

.lane-name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.picks {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin: 0;
  padding: 6px 0 2px;
  list-style: none;
}

.pick {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 8px;
}

.portrait {
  position: relative;
  display: grid;
  grid-row: 1 / 3;
}

.crown {
  position: absolute;
  top: -10px;
  left: 50%;
  translate: -50% 0;
  z-index: 1;
  color: var(--gold);
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.8));
}

.pick-name {
  font-size: 13px;
  font-weight: 600;
}

.items {
  display: flex;
  gap: 3px;
}

.empty-lane {
  font-size: 12.5px;
  color: var(--chalk-faint);
}

.synergies {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sides {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sides .ours {
  color: var(--ours);
}

.sides .theirs {
  color: var(--theirs);
}

@media (max-width: 560px) {
  .lane {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
