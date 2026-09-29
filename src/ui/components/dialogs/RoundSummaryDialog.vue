<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { Castle } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { structureSlotsOf } from '@/domain/match/structures'
import { MODES } from '@/content/modes'
import { MATCH } from '@/content/rules'
import { STRUCTURES } from '@/content/units'
import { starsLabel, useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useMatchStore } from '../../stores/match'
import { usePlanningTimerStore } from '../../stores/planningTimer'
import AnimatedNumber from '../common/AnimatedNumber.vue'
import type { MeterStat } from '../battle/DamageMeter.vue'
import MeterTabs from '../battle/MeterTabs.vue'
import HeroAvatar from '../common/HeroAvatar.vue'

const INCOME_STEP_MS = 220

const store = useMatchStore()
const timer = usePlanningTimerStore()
const text = useGameText()
const { t } = text

const summary = computed(() => store.view?.summary ?? null)

/** A duel's planning clock is already running while the summary is open. */
const duelSecondsLeft = computed(() =>
  store.isDuel && timer.remaining !== null ? Math.ceil(timer.remaining) : null,
)

const open = computed({
  get: () => store.phase === 'summary' && summary.value !== null,
  set: (value) => {
    if (!value) {
      store.nextRound()
    }
  },
})

useModal(open)

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
        ratio: hp / max,
        lost,
      }
    }

    return {
      slot,
      ours: side(0),
      theirs: side(1),
    }
  })
})

const meter = ref<MeterStat>('damageDealt')

const valueTitle = computed(() =>
  t(
    meter.value === 'healing'
      ? 'summary.heroHealing'
      : meter.value === 'damageReceived'
        ? 'summary.heroTaken'
        : 'summary.heroDamage',
  ),
)

/** Your heroes, by the stat picked. Healing lists only those who healed. */
const heroRows = computed(() => {
  const stat = meter.value

  const heroes = (summary.value?.heroes ?? [])
    .filter((hero) => hero.team === 0 && (stat !== 'healing' || hero.healing > 0))
    .sort((a, b) => b[stat] - a[stat])

  const top = Math.max(1, heroes[0]?.[stat] ?? 1)

  return heroes.map((hero) => ({
    ...hero,
    value: hero[stat],
    share: hero[stat] / top,
  }))
})

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
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent v-if="summary && income" class="sheet summary">
        <DialogTitle class="title hand" :data-verdict="verdict">
          {{ t(`summary.${verdict}`, { round: summary.round }) }}
        </DialogTitle>

        <DialogDescription class="reason">
          <Castle :size="15" />
          <span>{{ reason }}</span>
        </DialogDescription>

        <section class="fallen">
          <div v-for="side in ['theirs', 'ours'] as const" :key="side" class="fallen-side" :class="side">
            <h3 class="eyebrow">
              {{ t(side === 'theirs' ? 'summary.enemiesKilled' : 'summary.ourLosses') }} ·
              {{ side === 'theirs' ? summary.heroKills[0] : summary.heroKills[1] }}
            </h3>

            <ul v-if="fallen[side].length" class="graves">
              <li
                v-for="(hero, i) in fallen[side]"
                :key="hero.uid"
                class="grave anim-pop"
                :style="{ animationDelay: `${i * 70}ms` }"
              >
                <span class="portrait">
                  <HeroAvatar :hero-id="hero.heroId" :team="hero.team" :size="40" />
                  <span class="skull" aria-hidden="true">💀</span>
                  <span v-if="hero.deaths > 1" class="times">×{{ hero.deaths }}</span>
                </span>

                <span class="name">{{ text.heroName(hero.heroId) }}</span>
              </li>
            </ul>

            <p v-else class="none">{{ t('summary.noLosses') }}</p>
          </div>
        </section>

        <section>
          <MeterTabs v-model="meter" />

          <p v-if="meter === 'healing' && !heroRows.length" class="none">{{ t('summary.noHealing') }}</p>

          <ol v-else class="heroes" :class="meter">
            <li
              v-for="(hero, i) in heroRows"
              :key="hero.uid"
              class="hero anim-slide"
              :class="hero.team === 0 ? 'ours' : 'theirs'"
              :style="{ '--i': i }"
            >
              <HeroAvatar :hero-id="hero.heroId" :team="hero.team" :size="36" />

              <span class="bar">
                <i :style="{ width: `${hero.share * 100}%` }" />
                <span class="label">{{ text.heroName(hero.heroId) }} {{ starsLabel(hero.stars) }}</span>
              </span>

              <span class="num value" :title="valueTitle">
                {{ meter === 'healing' ? `+${text.number(hero.value)}` : text.number(hero.value) }}
              </span>
            </li>
          </ol>
        </section>

        <section>
          <h3 class="eyebrow">{{ t('summary.structures') }}</h3>

          <ul class="structures">
            <li v-for="row in structureRows" :key="row.slot" class="structure">
              <span class="side ours" :class="{ down: !row.ours.hp }">
                <span v-if="row.ours.lost" class="lost">−{{ text.number(row.ours.lost) }}</span>
                <span class="meter"><i :style="{ width: `${row.ours.ratio * 100}%` }" /></span>
                <span class="hp">{{ row.ours.hp ? text.number(row.ours.hp) : t('summary.destroyed') }}</span>
              </span>

              <span class="slot">{{ text.slotName(row.slot) }}</span>

              <span class="side theirs" :class="{ down: !row.theirs.hp }">
                <span class="hp">{{
                  row.theirs.hp ? text.number(row.theirs.hp) : t('summary.destroyed')
                }}</span>

                <span class="meter"><i :style="{ width: `${row.theirs.ratio * 100}%` }" /></span>
                <span v-if="row.theirs.lost" class="lost">−{{ text.number(row.theirs.lost) }}</span>
              </span>
            </li>
          </ul>
        </section>

        <ul class="income">
          <li
            v-for="(row, i) in incomeRows"
            :key="row.key"
            class="income-row"
            :class="{ empty: !row.amount }"
            :style="{ animationDelay: `${i * INCOME_STEP_MS}ms` }"
          >
            <span>{{ t(`summary.${row.key}`) }}</span>
            <span class="amount">+{{ row.amount }} <span class="coin" /></span>
          </li>

          <li class="income-row total" :style="{ animationDelay: `${incomeRows.length * INCOME_STEP_MS}ms` }">
            <span>{{ t('summary.total') }}</span>

            <span class="amount">
              <span
                >+<AnimatedNumber
                  :value="income.total"
                  :from="0"
                  :delay="incomeRows.length * INCOME_STEP_MS"
                  :duration="700"
              /></span>

              <span class="coin" />
            </span>
          </li>
        </ul>

        <button type="button" class="btn primary next" @click="store.nextRound()">
          {{ duelSecondsLeft === null ? t('summary.next') : t('summary.nextIn', { s: duelSecondsLeft }) }}
        </button>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(600px, calc(100vw - 32px));
  /* Rows slide in from the right; that must not open a horizontal bar for a moment. */
  overflow-x: hidden;
}

.title {
  font-size: 42px;
  line-height: 1.05;
}

.title[data-verdict='win'] {
  color: var(--ours);
}

.title[data-verdict='loss'] {
  color: var(--theirs);
}

.reason {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -4px 0 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--chalk-dim);
  font-size: 13px;
}

.reason svg {
  flex: none;
  color: var(--gold);
}

.fallen {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.fallen-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fallen-side.theirs .eyebrow {
  color: var(--ours);
}

.fallen-side.ours .eyebrow {
  color: var(--theirs);
}

.graves {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 28px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.grave {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 84px;
}

.portrait {
  position: relative;
  display: grid;
  place-items: center;
}

.portrait :deep(.disc) {
  filter: grayscale(0.7) brightness(0.55);
}

.skull {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 22px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

.times {
  position: absolute;
  right: -8px;
  bottom: -4px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--ink);
  border: 1px solid var(--edge-strong);
  font-size: 10px;
  font-weight: 700;
}

.name {
  max-width: 100%;
  font-size: 13px;
  color: var(--chalk-dim);
  text-align: center;
  line-height: 1.2;
}

.none {
  margin: 0;
  font-size: 12px;
  color: var(--chalk-faint);
}

section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.heroes {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hero {
  --team: var(--ours);
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  font-weight: 700;
}

.hero.theirs {
  --team: var(--theirs);
}

.bar {
  position: relative;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.bar i {
  position: absolute;
  inset: 0 auto 0 0;
  background: color-mix(in srgb, var(--team) 42%, transparent);
  animation: grow 0.6s ease-out both;
  transform-origin: left;
}

.label {
  position: relative;
  display: block;
  padding-left: 12px;
  line-height: 36px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.heroes.healing .value {
  color: var(--heal);
}

.heroes.healing .bar i {
  background: color-mix(in srgb, var(--heal) 38%, transparent);
}

.heroes.damageReceived .bar i {
  background: color-mix(in srgb, var(--theirs) 35%, transparent);
}

.structures {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.structure {
  display: grid;
  grid-template-columns: 1fr 64px 1fr;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.side {
  --team: var(--ours);
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.side.theirs {
  --team: var(--theirs);
  justify-content: flex-start;
}

.side.down {
  opacity: 0.45;
}

.meter {
  flex: 1;
  max-width: 130px;
  height: 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  display: flex;
}

.side.ours .meter {
  justify-content: flex-end;
}

.meter i {
  display: block;
  height: 100%;
  background: var(--team);
}

.hp {
  min-width: 3.4em;
  color: var(--chalk-dim);
}

.side.ours .hp {
  text-align: right;
}

.lost {
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255, 112, 96, 0.16);
  color: var(--theirs);
  font-weight: 700;
  animation: pop-in 0.35s ease-out both;
}

.side.theirs .lost {
  background: rgba(244, 197, 91, 0.16);
  color: var(--gold);
}

.slot {
  text-align: center;
  font-weight: 700;
}

.income {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-variant-numeric: tabular-nums;
}

.income-row {
  display: flex;
  justify-content: space-between;
  color: var(--chalk-dim);
  animation: income-in 0.35s ease-out both;
}

.amount {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.income-row.empty {
  opacity: 0.5;
}

.income-row.total {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid var(--edge);
  font-size: 16px;
  font-weight: 800;
  color: var(--gold);
}

@keyframes income-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

.next {
  width: 100%;
}

@keyframes grow {
  from {
    transform: scaleX(0);
  }
}
</style>
