<script setup lang="ts">
import { Check, ChevronRight, Crown, Flag, Shield, Star, Target, Trophy } from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ModeMap from '../modes/ModeMap.vue'

defineProps<{ focus: 'trials' | 'contracts' | 'milestones' | 'rewards' }>()
const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        firstClear: 'Первое прохождение',
        trial: 'Штурм трона',
        level: 'С уровня 2',
        exampleWeek: 'Пример недели',
        matches: 'Заверши 4 матча',
        rounds: 'Сыграй 18 раундов',
        towers: 'Разрушь 6 башен',
        weekReward: 'за все три контракта',
        milestone: 'Три звезды',
        milestoneGoal: 'Выставь героя с тремя звёздами',
        once: 'Разовая награда',
        exampleMatch: 'Пример наград за матч',
        match: 'Победа · 4 выигранных раунда',
        contract: 'Закрытый контракт',
        trialReward: 'Первый штурм трона',
        total: 'Всего за матч',
      }
    : {
        firstClear: 'First clear',
        trial: 'Throne assault',
        level: 'From level 2',
        exampleWeek: 'Example week',
        matches: 'Finish 4 matches',
        rounds: 'Play 18 rounds',
        towers: 'Destroy 6 towers',
        weekReward: 'for all three contracts',
        milestone: 'Three stars',
        milestoneGoal: 'Field a three-star hero',
        once: 'One-time reward',
        exampleMatch: 'Example match rewards',
        match: 'Victory · 4 rounds won',
        contract: 'Completed contract',
        trialReward: 'First throne assault',
        total: 'Total match XP',
      },
)
</script>

<template>
  <div class="illustration" :class="focus">
    <template v-if="focus === 'trials'">
      <ModeMap mode="twoLanes" :size="236" class="trial-map" />

      <div class="objective">
        <span class="label"><Shield :size="13" /> {{ copy.level }}</span>
        <strong>{{ copy.trial }}</strong>
        <span class="trial-reward"><Flag :size="14" /> +150 XP</span>
        <small>{{ copy.firstClear }}</small>
      </div>

      <span class="throne"><Crown :size="26" /></span>
    </template>

    <template v-else-if="focus === 'contracts'">
      <div class="contract-stack">
        <span class="label">{{ copy.exampleWeek }}</span>

        <div class="contract done">
          <Check :size="16" />

          <span>{{ copy.matches }}</span>

          <b>+120 XP</b>
        </div>

        <div class="contract">
          <Target :size="16" /><span>{{ copy.rounds }}<i style="--progress: 66.67%" /></span><b>12/18</b>
        </div>

        <div class="contract">
          <Target :size="16" /><span>{{ copy.towers }}<i style="--progress: 33.33%" /></span><b>2/6</b>
        </div>

        <div class="weekly-total">
          <b>360 XP</b><span>{{ copy.weekReward }}</span>
        </div>
      </div>
    </template>

    <template v-else-if="focus === 'milestones'">
      <div class="milestone-showcase">
        <div class="squad">
          <HeroAvatar hero-id="archer" :size="48" :stars="1" class="support" />
          <div class="champion"><HeroAvatar hero-id="warden" :size="88" :stars="3" /></div>
          <HeroAvatar hero-id="pyromancer" :size="48" :stars="2" class="support" />
        </div>

        <strong>{{ copy.milestone }}</strong>
        <small>{{ copy.milestoneGoal }}</small>
        <span class="milestone-reward"><Trophy :size="15" /> +200 XP <Check :size="14" /></span>
        <span class="label">{{ copy.once }}</span>

        <div class="collection">
          <Check :size="13" /><Check :size="13" /><Star :size="13" /><Star :size="13" /><Star :size="13" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="receipt">
        <span class="label">{{ copy.exampleMatch }}</span>

        <div>
          <span>{{ copy.match }}</span>

          <b>180</b>
        </div>

        <div>
          <span>{{ copy.contract }}</span>

          <b class="bonus">+120</b>
        </div>

        <div>
          <span>{{ copy.trialReward }}</span>

          <b class="bonus">+150</b>
        </div>

        <div class="receipt-total">
          <span>{{ copy.total }}</span>

          <strong>450 <small>XP</small></strong>
        </div>

        <div class="xp-track"><i /><ChevronRight :size="13" /></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.illustration {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 22px;
}
.label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--chalk-faint);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.trials {
  background: radial-gradient(ellipse at 75% 30%, #db735514, transparent 70%);
}
.trial-map {
  position: absolute;
  width: 72%;
  height: 90%;
  top: 4%;
  right: -5%;
  opacity: 0.7;
  rotate: -8deg;
}
.objective {
  position: relative;
  justify-self: start;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  max-width: 70%;
  padding: 18px;
  border: 1px solid #f4c55b30;
  border-radius: var(--radius);
  background: #111e18ed;
  box-shadow: 0 10px 40px #0006;
}
.objective .label {
  color: var(--gold);
}
.objective strong {
  font-size: 23px;
}
.trial-reward {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  color: var(--gold);
  font-size: 20px;
  font-weight: 800;
}
.objective small {
  font-size: 10px;
  color: var(--chalk-dim);
}
.throne {
  position: absolute;
  right: 16%;
  top: 17%;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid #e9866850;
  border-radius: 50%;
  background: #32251f;
  color: #e98668;
  box-shadow: 0 0 30px #e9866820;
}
.contract-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 320px;
}
.contract-stack > .label {
  margin-bottom: 4px;
}
.contract {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 12px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #192720;
  color: var(--chalk-faint);
  font-size: 11px;
}
.contract > span {
  flex: 1;
  min-width: 0;
  color: var(--chalk-dim);
}
.contract b {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.contract.done {
  border-color: #f4c55b40;
  background: #f4c55b0c;
  color: var(--gold);
}
.contract.done > span {
  color: var(--chalk);
}
.contract i {
  display: block;
  height: 3px;
  margin-top: 7px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f4c55b80 var(--progress), #ffffff0a var(--progress));
}
.weekly-total {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 9px;
  margin-top: 6px;
}
.weekly-total b {
  font-size: 23px;
  color: var(--gold);
}
.weekly-total span {
  font-size: 10px;
  color: var(--chalk-faint);
}
.milestone-showcase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.squad {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 3px;
}
.support {
  opacity: 0.45;
}
.champion {
  padding: 12px;
  border-radius: 50%;
  background: radial-gradient(#f4c55b20, transparent 70%);
  box-shadow:
    0 0 0 1px #f4c55b20,
    0 0 0 10px #f4c55b06;
}
.milestone-showcase strong {
  font-size: 22px;
}
.milestone-showcase small {
  font-size: 10px;
  color: var(--chalk-dim);
}
.milestone-reward {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 2px;
  color: var(--gold);
  font-size: 18px;
  font-weight: 800;
}
.collection {
  display: flex;
  gap: 8px;
  margin-top: 3px;
  color: #f4c55b50;
}
.collection svg:nth-child(-n + 2) {
  color: var(--gold);
}
.receipt {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 310px;
  padding: 20px;
  border: 1px solid #f4c55b30;
  border-radius: var(--radius);
  background: #18251f;
  box-shadow:
    8px 8px 0 #f4c55b06,
    0 16px 40px #0004;
}
.receipt > .label {
  margin-bottom: 4px;
}
.receipt > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  color: var(--chalk-dim);
}
.receipt b {
  font-size: 13px;
  color: var(--chalk);
  font-variant-numeric: tabular-nums;
}
.receipt b.bonus {
  color: var(--gold);
}
.receipt .receipt-total {
  padding-top: 14px;
  border-top: 1px dashed #f4c55b30;
}
.receipt-total strong {
  color: var(--gold);
  font-size: 31px;
}
.receipt-total small {
  font-size: 13px;
}
.receipt .xp-track {
  height: 7px;
  margin-top: -3px;
  border-radius: 5px;
  background: #ffffff0a;
  color: var(--gold);
}
.xp-track i {
  width: 73%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ab8437, var(--gold));
}
@media (max-width: 380px) {
  .illustration {
    padding: 16px;
  }
  .objective {
    padding: 14px;
  }
  .objective strong {
    font-size: 20px;
  }
  .squad {
    gap: 10px;
  }
}
</style>
