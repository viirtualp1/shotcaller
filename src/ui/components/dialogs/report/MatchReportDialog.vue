<script setup lang="ts">
import { Coins, Swords, Users } from 'lucide-vue-next'
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from 'reka-ui'
import { computed, ref } from 'vue'
import type { TeamId } from '@/content/ids'
import { structureSlotsOf } from '@/domain/match/structures'
import type { TeamReportView } from '@/application/views'
import { useGameText } from '../../../composables/useGameText'
import { useModal } from '../../../composables/useModal'
import { vOpticalAlign } from '../../../directives/opticalAlign'
import { useMatchStore } from '../../../stores/match'
import HeroAvatar from '../../common/HeroAvatar.vue'
import ProgressStrip from '../../profile/ProgressStrip.vue'
import HeroStatsTable from './HeroStatsTable.vue'
import StatComparison from './StatComparison.vue'
import type { ComparisonRow, HeroStatKey } from './reportModel'

const store = useMatchStore()
const text = useGameText()
const { t } = text

const result = computed(() => store.view?.result ?? null)
const report = computed(() => store.view?.report ?? null)
const open = computed(() => store.phase === 'finished' && result.value !== null && report.value !== null)
const tab = ref('heroes')
const sort = ref<HeroStatKey>('damageDealt')

useModal(open)

const verdict = computed(() =>
  result.value?.winner === 0 ? 'win' : result.value?.winner === 1 ? 'loss' : 'draw',
)

const heroes = computed(() => report.value?.heroes ?? [])
const topDamage = computed(() => Math.max(1, ...heroes.value.map((h) => h.damageDealt)))
const mvp = computed(() => heroes.value.find((h) => h.team === 0) ?? null)

function compare(
  key: string,
  label: string,
  pick: (team: TeamReportView, id: TeamId) => number,
): ComparisonRow {
  const teams = report.value!.teams

  return {
    key,
    label,
    values: [pick(teams[0], 0), pick(teams[1], 1)],
  }
}

const heroTotal = (team: TeamId, key: HeroStatKey) =>
  heroes.value.filter((h) => h.team === team).reduce((sum, h) => sum + h[key], 0)

const economy = computed(() => [
  compare('earned', t('report.economy.goldEarned'), (s) => s.stats.income.total),
  compare('base', t('report.economy.base'), (s) => s.stats.income.base),
  compare('interest', t('report.economy.interest'), (s) => s.stats.income.interest),
  compare('farm', t('report.economy.farm'), (s) => s.stats.income.farm),
  compare('winBonus', t('report.economy.winBonus'), (s) => s.stats.income.win),
  compare('sales', t('report.economy.goldFromSales'), (s) => s.ledger.goldFromSales),
  compare('spent', t('report.economy.goldSpent'), (s) => s.ledger.goldSpent),
  compare('heroesBought', t('report.economy.heroesBought'), (s) => s.ledger.heroesBought),
  compare('heroesSold', t('report.economy.heroesSold'), (s) => s.ledger.heroesSold),
  compare('promotions', t('report.economy.promotions'), (s) => s.ledger.promotions),
  compare('itemsBought', t('report.economy.itemsBought'), (s) => s.ledger.itemsBought),
  compare('itemsSold', t('report.economy.itemsSold'), (s) => s.ledger.itemsSold),
  compare('rerolls', t('report.economy.rerolls'), (s) => s.ledger.rerolls),
  compare('xpBought', t('report.economy.xpBought'), (s) => s.ledger.xpBought),
  compare('level', t('report.economy.level'), (s) => s.level),
])

const combat = computed(() => [
  compare('roundsWon', t('report.combat.roundsWon'), (s) => s.stats.roundsWon),
  compare('heroKills', t('report.combat.heroKills'), (s) => s.stats.heroKills),
  compare('creepKills', t('report.combat.creepKills'), (s) => s.stats.creepKills),
  compare('heroDamage', t('report.combat.heroDamage'), (_, id) => heroTotal(id, 'damageDealt')),
  compare('received', t('report.combat.damageReceived'), (_, id) => heroTotal(id, 'damageReceived')),
  compare('healing', t('report.combat.healing'), (_, id) => heroTotal(id, 'healing')),
  compare('towers', t('report.combat.towersDestroyed'), (s) => s.towersDestroyed),
  ...structureSlotsOf(store.view?.mode ?? 'threeLanes').map((slot) =>
    compare(
      `slot-${slot}`,
      t('report.combat.slotDamage', { slot: text.slotName(slot) }),
      (s) => s.stats.structureDamage[slot],
    ),
  ),
])
</script>

<template>
  <DialogRoot :open="open">
    <DialogPortal>
      <DialogOverlay class="overlay menu-overlay" />

      <DialogContent
        class="report"
        :aria-describedby="undefined"
        @escape-key-down.prevent
        @pointer-down-outside.prevent
      >
        <header class="head">
          <DialogTitle v-optical-align class="title hand" :data-verdict="verdict">{{
            t(`result.${verdict}`)
          }}</DialogTitle>

          <p v-if="mvp" class="mvp">
            <HeroAvatar :hero-id="mvp.heroId" :stars="mvp.bestStars" :size="30" />

            <span>
              <span class="eyebrow">{{ t('report.mvp') }}</span>
              <strong>{{ text.heroName(mvp.heroId) }}</strong> ·
              {{ t('report.mvpDamage', { damage: text.number(mvp.damageDealt) }) }}
            </span>
          </p>
        </header>

        <ProgressStrip />

        <TabsRoot v-model="tab" class="tabs">
          <TabsList class="tab-list" :aria-label="t('report.title')">
            <TabsTrigger value="heroes" class="tab"
              ><Users :size="15" /> {{ t('report.tabs.heroes') }}</TabsTrigger
            >

            <TabsTrigger value="combat" class="tab"
              ><Swords :size="15" /> {{ t('report.tabs.combat') }}</TabsTrigger
            >

            <TabsTrigger value="economy" class="tab"
              ><Coins :size="15" /> {{ t('report.tabs.economy') }}</TabsTrigger
            >
          </TabsList>

          <TabsContent value="heroes" class="panel">
            <HeroStatsTable v-model:sort="sort" :heroes="heroes" :team="0" :top-damage="topDamage" />
            <HeroStatsTable v-model:sort="sort" :heroes="heroes" :team="1" :top-damage="topDamage" />
          </TabsContent>

          <TabsContent value="combat" class="panel">
            <div class="sides">
              <span class="ours">{{ t('report.ours') }}</span>
              <span class="theirs">{{ t('report.theirs') }}</span>
            </div>

            <StatComparison :rows="combat" />
            <p v-if="report?.draws" class="note">{{ t('report.draws', { n: report.draws }) }}</p>
          </TabsContent>

          <TabsContent value="economy" class="panel">
            <div class="sides">
              <span class="ours">{{ t('report.ours') }}</span>
              <span class="theirs">{{ t('report.theirs') }}</span>
            </div>

            <StatComparison :rows="economy" />
          </TabsContent>
        </TabsRoot>

        <footer class="actions">
          <button
            v-if="!store.isDuel"
            type="button"
            class="btn primary big"
            @click="store.newMatch(store.view?.mode)"
          >
            {{ t('result.again') }}
          </button>

          <button
            type="button"
            class="btn big"
            :class="store.isDuel ? 'primary' : 'ghost'"
            @click="store.leaveToMenu()"
          >
            {{ t('result.menu') }}
          </button>
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.report {
  position: fixed;
  inset: 50% auto auto 50%;
  translate: -50% -50%;
  z-index: 41;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(860px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  padding: 22px 24px;
  border-radius: 18px;
  background: var(--panel);
  border: 1px solid var(--edge-strong);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  animation: menu-in 0.3s ease-out;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 18px;
}

.title {
  font-size: 56px;
  line-height: 1;
}

.title[data-verdict='win'] {
  color: var(--gold);
}

.title[data-verdict='loss'] {
  color: var(--theirs);
}

.mvp {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 6px 12px;
  border-radius: 10px;
  background: rgba(244, 197, 91, 0.08);
  border: 1px solid rgba(244, 197, 91, 0.3);
  font-size: 13px;
}

.mvp .eyebrow {
  display: block;
  color: var(--gold);
}

.tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  flex: 1;
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
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 4px;
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

.note {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--chalk-faint);
}

.actions {
  display: flex;
  gap: 10px;
}

.actions .btn {
  flex: 1;
}
</style>
