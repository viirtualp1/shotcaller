<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'reka-ui'
import { Castle, ChevronDown, Coins, LayoutDashboard, Skull, Swords, Users, X } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { structureSlotsOf } from '@/domain/match/structures'
import { MODES } from '@/content/modes'
import { MATCH } from '@/content/rules'
import { STRUCTURES } from '@/content/units'
import { useFighterLabels } from '../../composables/useFighterLabels'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useMatchStore } from '../../stores/match'
import { usePlanningTimerStore } from '../../stores/planningTimer'
import { useRoundReportStore } from '../../stores/roundReport'
import AnimatedNumber from '../common/AnimatedNumber.vue'
import type { MeterStat } from '../battle/meter'
import HeroMeterList from '../battle/HeroMeterList.vue'
import FighterLabel from '../battle/FighterLabel.vue'
import MeterTabs from '../battle/MeterTabs.vue'
import HeroAvatar from '../common/HeroAvatar.vue'

const store = useMatchStore()
const timer = usePlanningTimerStore()
const roundReport = useRoundReportStore()
const tab = ref('overview')
const text = useGameText()
const { t } = text

const summary = computed(() => store.view?.summary ?? null)

/** A duel's planning clock is already running while the summary is open. */
const duelSecondsLeft = computed(() =>
  store.isDuel && timer.remaining !== null ? Math.ceil(timer.remaining) : null,
)

useModal(() => roundReport.open)

watch(
  () => summary.value?.round,
  () => {
    tab.value = 'overview'
  },
)

const verdict = computed(() => {
  const winner = summary.value?.winner
  return winner === 0 ? 'win' : winner === 1 ? 'loss' : 'draw'
})

/** A round goes to whoever scored more, building damage and kills where they count; a small gap is a draw. */
const reason = computed(() => {
  if (!summary.value || !store.view) {
    return ''
  }

  const [ours, theirs] = summary.value.score.map((score) => text.number(Math.round(score)))
  const kills = MODES[store.view.mode].killScore

  return t(`summary.${kills ? 'scoreReason' : 'reason'}.${verdict.value}`, {
    ours,
    theirs,
    threshold: MATCH.drawThreshold,
    kill: kills,
  })
})

/** Health after the round, plus how much each side lost this round. */
const structureRows = computed(() => {
  const view = store.view
  if (!view || !summary.value) {
    return []
  }

  return structureSlotsOf(view.mode).map((slot) => {
    const max = slot === 'throne' ? STRUCTURES.throne.hp : STRUCTURES.tower.hp
    const side = (team: 0 | 1) => {
      const hp = Math.round(view.structures[team][slot])
      const lost = Math.round(summary.value!.laneDamage[slot][team === 0 ? 1 : 0])
      return {
        hp,
        ratio: Math.min(1, Math.max(0, hp / max)),
        lost,
      }
    }

    return {
      slot,
      max,
      ours: side(0),
      theirs: side(1),
    }
  })
})

const meter = ref<MeterStat>('damageDealt')
const fighterLabel = useFighterLabels(() => summary.value?.heroes ?? [])

const fallen = computed(() => {
  const heroes = (summary.value?.heroes ?? []).filter((h) => h.deaths > 0)
  return {
    theirs: heroes.filter((h) => h.team === 1),
    ours: heroes.filter((h) => h.team === 0),
  }
})

const income = computed(() => summary.value?.income[0])

const incomeRows = computed(() => {
  const value = income.value
  if (!value) {
    return []
  }

  return [
    {
      key: 'base',
      amount: value.base,
    },
    {
      key: 'interest',
      amount: value.interest,
    },
    {
      key: 'farm',
      amount: value.farm,
    },
    {
      key: 'winBonus',
      amount: value.win,
    },
  ]
})
</script>

<template>
  <DialogRoot v-model:open="roundReport.open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent v-if="summary && income" class="sheet summary">
        <header class="head">
          <DialogTitle class="title hand" :data-verdict="verdict">
            {{ t(`summary.${verdict}`, { round: summary.round }) }}
          </DialogTitle>

          <button
            v-if="roundReport.reviewing"
            type="button"
            class="icon-btn"
            :aria-label="t('summary.closeReport')"
            @click="roundReport.open = false"
          >
            <X :size="18" />
          </button>
        </header>

        <div class="highlights">
          <div class="highlight gold">
            <span class="highlight-label"><Coins :size="14" /> {{ t('summary.income') }}</span>
            <strong>+<AnimatedNumber :value="income.total" :from="0" :duration="500" /></strong>
          </div>

          <div class="highlight">
            <span class="highlight-label"><Swords :size="14" /> {{ t('summary.enemiesKilled') }}</span>
            <strong>{{ text.number(summary.heroKills[0]) }}</strong>
          </div>

          <div class="highlight">
            <span class="highlight-label"><Skull :size="14" /> {{ t('summary.ourLosses') }}</span>
            <strong>{{ text.number(summary.heroKills[1]) }}</strong>
          </div>
        </div>

        <details :key="summary.round" class="judgement">
          <summary class="score-line">
            <Castle :size="14" />

            <span>{{
              t(MODES[store.view!.mode].killScore ? 'summary.roundScore' : 'summary.buildingDamage')
            }}</span>

            <span class="score"
              ><b class="ours">{{ text.number(Math.round(summary.score[0])) }}</b>

              <span>:</span>

              <b class="theirs">{{ text.number(Math.round(summary.score[1])) }}</b></span
            >

            <ChevronDown :size="14" class="chevron" />
          </summary>

          <DialogDescription class="reason">{{ reason }}</DialogDescription>
        </details>

        <TabsRoot v-model="tab" class="tabs">
          <TabsList class="tab-list" :aria-label="t('summary.lastRound', { round: summary.round })">
            <TabsTrigger value="overview" class="tab"
              ><LayoutDashboard :size="14" /> {{ t('summary.tabs.overview') }}</TabsTrigger
            >

            <TabsTrigger value="heroes" class="tab"
              ><Users :size="14" /> {{ t('report.tabs.heroes') }}</TabsTrigger
            >

            <TabsTrigger value="income" class="tab"
              ><Coins :size="14" /> {{ t('summary.income') }}</TabsTrigger
            >
          </TabsList>

          <TabsContent value="overview" class="panel">
            <section class="building-status" :aria-label="t('summary.structures')">
              <div class="section-head">
                <h3>{{ t('summary.buildings') }}</h3>
                <span>{{ t('summary.hpRemaining') }}</span>
              </div>

              <div class="team-labels">
                <span class="ours">{{ t('report.ours') }}</span>

                <span class="theirs">{{ t('report.theirs') }}</span>
              </div>

              <ul class="structures">
                <li v-for="row in structureRows" :key="row.slot" class="structure">
                  <div class="side ours" :class="{ down: !row.ours.hp }">
                    <div class="structure-reading">
                      <span class="hp"
                        >{{ row.ours.hp ? text.number(row.ours.hp) : t('summary.destroyed')
                        }}<small v-if="row.ours.hp"> / {{ text.number(row.max) }}</small></span
                      >

                      <span class="lost" :class="{ zero: !row.ours.lost }">{{
                        row.ours.lost ? `−${text.number(row.ours.lost)}` : '—'
                      }}</span>
                    </div>

                    <span class="health-track" aria-hidden="true"
                      ><i :style="{ width: `${row.ours.ratio * 100}%` }"
                    /></span>
                  </div>

                  <span class="slot">{{ text.slotName(row.slot) }}</span>

                  <div class="side theirs" :class="{ down: !row.theirs.hp }">
                    <div class="structure-reading">
                      <span class="hp"
                        >{{ row.theirs.hp ? text.number(row.theirs.hp) : t('summary.destroyed')
                        }}<small v-if="row.theirs.hp"> / {{ text.number(row.max) }}</small></span
                      >

                      <span class="lost" :class="{ zero: !row.theirs.lost }">{{
                        row.theirs.lost ? `−${text.number(row.theirs.lost)}` : '—'
                      }}</span>
                    </div>

                    <span class="health-track" aria-hidden="true"
                      ><i :style="{ width: `${row.theirs.ratio * 100}%` }"
                    /></span>
                  </div>
                </li>
              </ul>
            </section>

            <details :key="summary.round" class="casualties">
              <summary class="casualties-toggle">
                {{ t('summary.casualties') }} <ChevronDown :size="14" />
              </summary>

              <section class="fallen" :aria-label="t('summary.casualties')">
                <div
                  v-for="side in ['theirs', 'ours'] as const"
                  :key="side"
                  class="fallen-side"
                  :class="side"
                >
                  <h3>{{ t(side === 'theirs' ? 'summary.enemiesKilled' : 'summary.ourLosses') }}</h3>

                  <ul v-if="fallen[side].length" class="graves">
                    <li v-for="hero in fallen[side]" :key="hero.uid" class="grave">
                      <HeroAvatar :hero-id="hero.heroId" :team="hero.team" :size="24" />

                      <FighterLabel
                        v-bind="fighterLabel(hero)"
                        :item-size="14"
                        class="fallen-name"
                        :title="fighterLabel(hero).name"
                      />

                      <span class="deaths">×{{ hero.deaths }}</span>
                    </li>
                  </ul>

                  <p v-else class="none">{{ t('summary.noLosses') }}</p>
                </div>
              </section>
            </details>
          </TabsContent>

          <TabsContent value="heroes" class="panel">
            <MeterTabs v-model="meter" />
            <HeroMeterList :heroes="summary.heroes" :stat="meter" scale-hint />
          </TabsContent>

          <TabsContent value="income" class="panel">
            <section class="economy">
              <div class="section-head">
                <h3>{{ t('summary.incomeBreakdown') }}</h3>
              </div>

              <dl class="income">
                <div
                  v-for="row in incomeRows"
                  :key="row.key"
                  class="income-row"
                  :class="{ empty: !row.amount }"
                >
                  <dt>{{ t(`summary.${row.key}`) }}</dt>
                  <dd>+{{ text.number(row.amount) }} <span class="coin" /></dd>
                </div>

                <div class="income-row total">
                  <dt>{{ t('summary.total') }}</dt>
                  <dd>+{{ text.number(income.total) }} <span class="coin" /></dd>
                </div>
              </dl>
            </section>
          </TabsContent>
        </TabsRoot>

        <footer class="actions">
          <button type="button" class="btn primary next" @click="roundReport.open = false">
            {{
              roundReport.reviewing
                ? t('summary.closeReport')
                : duelSecondsLeft === null
                  ? t('summary.next')
                  : t('summary.nextIn', { s: duelSecondsLeft })
            }}
          </button>
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(660px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  padding: 20px;
  overflow: hidden;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.head,
.highlights,
.judgement,
.actions,
.tab-list {
  flex: none;
}
.title {
  font-size: 38px;
  line-height: 1.05;
}
.title[data-verdict='win'] {
  color: var(--ours);
}
.title[data-verdict='loss'] {
  color: var(--theirs);
}
.highlights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--edge);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
}
.highlight {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
}
.highlight + .highlight {
  border-left: 1px solid var(--edge);
}
.highlight-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--chalk-dim);
}
.highlight-label svg {
  flex: none;
}
.highlight strong {
  font-size: 24px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.gold {
  color: var(--gold);
}
.score-line {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  list-style: none;
  font-size: 12px;
  color: var(--chalk-dim);
}
.score-line::-webkit-details-marker {
  display: none;
}
.score-line > svg:first-child {
  color: var(--gold);
  flex: none;
}
.score {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  margin-left: auto;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ours {
  color: var(--ours);
}
.theirs {
  color: var(--theirs);
}
.judgement[open] .chevron {
  rotate: 180deg;
}
.reason {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-left: 2px solid var(--gold);
  background: rgba(244, 197, 91, 0.04);
  font-size: 12px;
  line-height: 1.5;
  color: var(--chalk-dim);
}
.tabs {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
  max-height: min(420px, 50dvh);
  overflow: auto;
  padding: 2px;
  overscroll-behavior: contain;
}
.panel[data-state='inactive'] {
  display: none;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}
h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--chalk-dim);
}
.section-head > span {
  font-size: 10px;
  color: var(--chalk-faint);
}
.team-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 700;
}
.structures {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.structure {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  font-variant-numeric: tabular-nums;
}
.side {
  min-width: 0;
}
.side.down {
  opacity: 0.5;
}
.structure-reading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 6px;
}
.hp {
  font-size: 12px;
  font-weight: 700;
  color: var(--chalk);
  white-space: nowrap;
}
.hp small {
  font-size: 10px;
  font-weight: 400;
  color: var(--chalk-faint);
}
.lost {
  font-size: 10px;
  font-weight: 700;
  color: var(--theirs);
}
.theirs .lost {
  color: var(--gold);
}
.lost.zero {
  color: var(--chalk-faint);
  font-weight: 400;
}
.health-track {
  display: block;
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.health-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--ours);
}
.theirs .health-track i {
  background: var(--theirs);
}
.slot {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--chalk-dim);
}
.casualties {
  padding-top: 12px;
  border-top: 1px solid var(--edge);
}
.casualties-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--chalk-dim);
  cursor: pointer;
  list-style: none;
}
.casualties-toggle::-webkit-details-marker {
  display: none;
}
.casualties[open] .casualties-toggle svg {
  rotate: 180deg;
}
.fallen {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  padding-top: 14px;
}
.fallen-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.graves {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 2px;
  list-style: none;
}
.grave {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.fallen-name {
  font-size: 11px;
  color: var(--chalk-dim);
}
.deaths {
  color: var(--chalk-faint);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.none {
  margin: 0;
  font-size: 12px;
  color: var(--chalk-faint);
}
.income {
  margin: 0;
}
.income-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  font-size: 13px;
  color: var(--chalk-dim);
}
.income-row + .income-row {
  border-top: 1px solid var(--edge);
}
.income-row dd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.income-row.empty {
  color: var(--chalk-faint);
}
.income-row.total {
  font-size: 16px;
  font-weight: 800;
  color: var(--gold);
}
.actions {
  padding-top: 12px;
  border-top: 1px solid var(--edge);
}
.next {
  width: 100%;
}
@media (max-width: 560px) {
  .summary {
    gap: 12px;
    padding: 16px;
  }
  .title {
    font-size: 30px;
  }
  .highlight {
    padding: 10px 8px;
  }
  .highlight-label {
    gap: 4px;
    font-size: 10px;
  }
  .highlight strong {
    font-size: 22px;
  }
  .structure {
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) 60px minmax(0, 1fr);
  }
  .hp {
    font-size: 11px;
  }
  .hp small,
  .lost {
    font-size: 9px;
  }
  .fallen {
    gap: 12px;
  }
  .grave {
    gap: 6px;
  }
}
@media (max-width: 360px) {
  .structure-reading {
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }
}
@media (max-height: 540px) {
  .summary {
    gap: 8px;
    padding: 12px;
  }
  .title {
    font-size: 26px;
  }
  .highlight {
    padding-block: 8px;
    gap: 4px;
  }
  .highlight strong {
    font-size: 20px;
  }
  .tabs {
    gap: 8px;
  }
  .actions {
    padding-top: 8px;
  }
}
</style>
