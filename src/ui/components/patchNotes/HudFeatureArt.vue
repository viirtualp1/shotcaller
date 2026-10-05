<script setup lang="ts">
import { ArrowUpRight, BellRing, Check, Expand, Shield, Sparkles, Timer } from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ModeMap from '../modes/ModeMap.vue'

defineProps<{ focus: 'scoreboard' | 'lineup' | 'scale' | 'twist' }>()

const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        planning: 'Подготовка',
        battle: 'Раунд начался',
        reminder: 'Табло появляется к началу боя',
        lane: 'Верхняя линия',
        reserve: 'Запас под рукой',
        scale: 'Больше места. Тот же контроль.',
        twist: 'Новый поворот',
        effect: 'Время изменить план',
        notice: 'Табло остаётся открытым',
        round: 'Раунд 4',
      }
    : {
        planning: 'Planning',
        battle: 'Round started',
        reminder: 'The scoreboard appears as battle begins',
        lane: 'Top lane',
        reserve: 'Reserves within reach',
        scale: 'More room. Same control.',
        twist: 'New round twist',
        effect: 'Time to rethink your plan',
        notice: 'The scoreboard stays open',
        round: 'Round 4',
      },
)
</script>

<template>
  <div class="illustration" :class="focus">
    <template v-if="focus === 'scoreboard'">
      <div class="countdown">
        <span><Timer :size="16" /> {{ copy.battle }}</span>
        <strong class="hand">01:00</strong>
        <div class="track"><i /></div>
      </div>

      <span class="caption"><BellRing :size="14" /> {{ copy.reminder }}</span>
    </template>

    <template v-else-if="focus === 'lineup'">
      <div class="lane-card">
        <div class="matchup">
          <HeroAvatar hero-id="giant" :size="44" :stars="2" />
          <strong class="hand">{{ copy.lane }}</strong>
          <HeroAvatar hero-id="butcher" :team="1" :size="44" />
        </div>

        <div class="synergies">
          <span><Shield :size="14" /><i /><i /></span><span><Sparkles :size="14" /><i /></span>
        </div>

        <div class="reserves">
          <HeroAvatar hero-id="archer" :size="34" />
          <HeroAvatar hero-id="acolyte" :size="34" />
          <span class="reserve-caption"><Check :size="13" /> {{ copy.reserve }}</span>
        </div>
      </div>
    </template>

    <template v-else-if="focus === 'scale'">
      <div class="frame">
        <div class="mini-tools"><HeroAvatar hero-id="warden" :size="32" /><i /><i /><i /></div>
        <ModeMap mode="twoLanes" :size="156" />
        <div class="mini-tools right"><Expand :size="20" /><i /><i /></div>
        <ArrowUpRight class="expand-arrow" :size="34" />
      </div>

      <strong class="hand scale-caption">{{ copy.scale }}</strong>
    </template>

    <template v-else>
      <div class="twist-stack">
        <div class="round">
          <Shield :size="18" />

          <span
            >{{ copy.round }}<b class="hand">{{ copy.planning }}</b></span
          >

          <Shield :size="18" />
        </div>

        <div class="announcement">
          <Sparkles :size="27" />

          <div>
            <strong>{{ copy.twist }}</strong>
            <p>{{ copy.effect }}</p>
          </div>
        </div>

        <span class="caption"><Check :size="14" /> {{ copy.notice }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.illustration {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px;
}
.countdown {
  width: min(100%, 260px);
  padding: 18px 24px;
  border: 1px solid #db73554d;
  border-radius: var(--radius);
  text-align: center;
  background: linear-gradient(145deg, #30231b, #172019);
  box-shadow: 0 12px 35px #0005;
}
.countdown > span {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--chalk-dim);
  font-size: 12px;
}
.countdown strong {
  display: block;
  margin: 4px 0 12px;
  font-size: 72px;
  line-height: 1;
  color: var(--theirs);
}
.track {
  height: 4px;
  overflow: hidden;
  background: #ffffff10;
  border-radius: 99px;
}
.track i {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--theirs);
}
.caption {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 7px;
  color: var(--chalk-dim);
  font-size: 11px;
  text-align: center;
}
.lane-card {
  width: min(100%, 320px);
  padding: 20px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #1b2922;
  box-shadow: 0 15px 35px #0005;
}
.matchup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 20px;
}
.matchup strong {
  font-size: 24px;
  line-height: 1;
  text-align: center;
}
.synergies {
  display: flex;
  justify-content: space-between;
  margin: 22px 0;
  color: var(--ours);
}
.synergies span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.synergies span + span {
  color: var(--theirs);
}
.synergies i {
  width: 22px;
  height: 5px;
  background: currentColor;
  opacity: 0.4;
  border-radius: 99px;
}
.reserves {
  display: flex;
  gap: 9px;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--edge);
}
.reserve-caption {
  flex: 1;
  font-size: 10px;
  line-height: 1.5;
  color: var(--chalk-dim);
}
.reserve-caption svg {
  color: var(--ours);
  vertical-align: middle;
}
.frame {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: min(100%, 320px);
  padding: 22px 12px;
  border: 1px solid #f4c55b50;
  border-radius: var(--radius);
  background: #18281f;
  box-shadow:
    0 0 0 8px #f4c55b06,
    0 15px 35px #0005;
}
.frame :deep(.mode-map) {
  width: 55%;
  height: auto;
}
.mini-tools {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 40px;
  color: var(--gold);
}
.mini-tools i {
  width: 100%;
  height: 8px;
  border-radius: 99px;
  background: #cdd6ba22;
}
.mini-tools i:last-child {
  width: 70%;
}
.expand-arrow {
  position: absolute;
  top: -18px;
  right: -14px;
  color: var(--gold);
}
.scale-caption {
  color: var(--gold);
  font-size: 27px;
  text-align: center;
  line-height: 1.1;
}
.twist-stack {
  width: min(100%, 300px);
}
.round {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 17px 22px;
  border: 1px solid var(--edge);
  border-radius: var(--radius) var(--radius) 0 0;
  background: #17221c;
  color: var(--ours);
}
.round > svg:last-child {
  color: var(--theirs);
}
.round span {
  display: grid;
  gap: 5px;
  text-align: center;
  font-size: 10px;
  color: var(--chalk-dim);
}
.round b {
  font-size: 26px;
  color: var(--gold);
}
.announcement {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 18px;
  border: 1px solid #f4c55b80;
  border-radius: 0 0 var(--radius) var(--radius);
  background: linear-gradient(135deg, #3b3420, #202c21);
  box-shadow: 0 15px 35px #0005;
  color: var(--gold);
}
.announcement > svg {
  flex: none;
}
.announcement strong {
  font-size: 14px;
}
.announcement p {
  margin: 6px 0 0;
  color: var(--chalk-dim);
  font-size: 11px;
  line-height: 1.5;
}
.twist-stack .caption {
  margin-top: 22px;
}
@media (max-width: 380px) {
  .illustration {
    padding: 18px;
    gap: 12px;
  }
  .lane-card {
    padding: 14px;
  }
  .matchup strong {
    font-size: 20px;
  }
  .countdown {
    padding: 12px 20px;
  }
  .countdown strong {
    font-size: 60px;
  }
}
</style>
