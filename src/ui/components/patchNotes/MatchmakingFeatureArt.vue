<script setup lang="ts">
import {
  ArrowRight,
  Check,
  Cloud,
  Coins,
  Eye,
  LoaderCircle,
  Search,
  ShieldCheck,
  Users,
  X,
} from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import RankMedal from '../profile/RankMedal.vue'

defineProps<{ focus: 'queue' | 'rating' | 'fairness' | 'efficiency' }>()

const settings = useSettingsStore()

// Historical examples deliberately use fixed values rather than live ratings or match data.
const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        searching: 'Ищем соперника…',
        mode: 'Рейтинг · Две линии',
        profile: 'Профиль',
        career: 'Карьера',
        sample: 'Пример · равный рейтинг',
        victory: 'Победа',
        earned: 'Заработано',
        squad: 'Стоимость состава',
        verified: 'Состав проверен',
        gold: 'золота',
        friends: 'Статус друзей',
        broadcast: 'Прямой эфир',
        saves: 'Облачные сохранения',
        online: 'Только друзья',
        viewing: 'По запросу зрителя',
        compact: 'Меньше данных',
      }
    : {
        searching: 'Finding an opponent…',
        mode: 'Ranked · Two lanes',
        profile: 'Profile',
        career: 'Career',
        sample: 'Example · equal ratings',
        victory: 'Victory',
        earned: 'Gold earned',
        squad: 'Squad value',
        verified: 'Lineup checked',
        gold: 'gold',
        friends: 'Friends’ status',
        broadcast: 'Live broadcast',
        saves: 'Cloud saves',
        online: 'Friends only',
        viewing: 'When a friend watches',
        compact: 'Less data',
      },
)
</script>

<template>
  <div class="illustration" :class="focus">
    <template v-if="focus === 'queue'">
      <div class="queue-bar">
        <LoaderCircle :size="19" />

        <div>
          <strong>{{ copy.searching }}</strong>

          <span>{{ copy.mode }}</span>
        </div>

        <time>0:24</time><X :size="16" class="cancel" />
      </div>

      <div class="browse">
        <div class="profile">
          <RankMedal tier="strategist" :stars="3" :size="54" />

          <strong>{{ copy.profile }}</strong>

          <i />

          <i />
        </div>

        <span class="career"><Search :size="13" /> {{ copy.career }} <ArrowRight :size="13" /></span>
      </div>
    </template>

    <template v-else-if="focus === 'rating'">
      <div class="rating-example">
        <span class="label">{{ copy.sample }}</span>

        <div class="medals">
          <RankMedal tier="shotcaller" :size="56" />

          <span class="hand">VS</span>

          <RankMedal tier="shotcaller" :size="56" />
        </div>

        <span class="ratings">1 500 MMR <span>·</span> 1 500 MMR</span>
        <span class="victory"><Check :size="14" /> {{ copy.victory }}</span>

        <div class="rating-change">
          <strong>1 500</strong><ArrowRight :size="22" /><strong class="after">1 525</strong>
        </div>

        <span class="gain">+25 MMR</span>
      </div>
    </template>

    <template v-else-if="focus === 'fairness'">
      <div class="budget">
        <div class="heroes">
          <HeroAvatar hero-id="giant" :size="42" :stars="2" />

          <HeroAvatar hero-id="sniper" :size="42" />

          <HeroAvatar hero-id="acolyte" :size="42" />
        </div>

        <div class="balance">
          <span>{{ copy.earned }}</span>

          <b><Coins :size="14" /> 42</b>
        </div>

        <div class="balance">
          <span>{{ copy.squad }}</span>

          <b
            >38 <small>{{ copy.gold }}</small></b
          >
        </div>

        <div class="budget-track"><i /></div>
        <span class="verified"><ShieldCheck :size="18" /> {{ copy.verified }}</span>
      </div>
    </template>

    <template v-else>
      <div class="updates">
        <div>
          <Users :size="20" />

          <span
            ><strong>{{ copy.friends }}</strong>

            <small>{{ copy.online }}</small></span
          >

          <span class="pulse"><i /><i /><i /></span>
        </div>

        <div>
          <Eye :size="20" />

          <span
            ><strong>{{ copy.broadcast }}</strong>

            <small>{{ copy.viewing }}</small></span
          >

          <span class="pulse live"><i /><i /><i /></span>
        </div>

        <div>
          <Cloud :size="20" />

          <span
            ><strong>{{ copy.saves }}</strong>

            <small>{{ copy.compact }}</small></span
          >

          <Check :size="16" class="check" />
        </div>
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
  padding: 24px;
}
.queue {
  align-content: start;
  gap: 25px;
  padding-top: 0;
}
.queue-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  border: 1px solid #f4c55b80;
  border-top: 0;
  border-bottom: 3px solid var(--gold);
  border-radius: 0 0 var(--radius) var(--radius);
  background: #213229;
  color: var(--gold);
  box-shadow: 0 8px 24px #0004;
}
.queue-bar > svg {
  flex: none;
}
.queue-bar > div {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.queue-bar strong {
  font-size: 12px;
  white-space: nowrap;
}
.queue-bar span {
  font-size: 9px;
  color: var(--chalk-dim);
}
.queue-bar time {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}
.queue-bar .cancel {
  color: var(--chalk-faint);
}
.browse {
  width: 86%;
  padding: 15px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #233128;
  rotate: -3deg;
}
.profile {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 7px 12px;
}
.profile :deep(.medal) {
  grid-row: span 3;
}
.profile strong {
  font-size: 17px;
}
.profile i {
  height: 4px;
  width: 85%;
  background: #ffffff15;
  border-radius: 5px;
}
.profile i:last-child {
  width: 55%;
  background: #6fc9a350;
}
.career {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--edge);
  color: var(--gold);
  font-size: 11px;
}
.rating-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 11px;
}
.label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--chalk-faint);
}
.medals {
  display: flex;
  align-items: center;
  gap: 30px;
}
.medals > span {
  color: var(--gold);
  font-size: 23px;
}
.ratings {
  font-size: 11px;
  font-weight: 700;
  color: var(--chalk-dim);
}
.ratings > span {
  margin: 0 14px;
  color: var(--chalk-faint);
}
.victory {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--heal);
  font-size: 11px;
}
.rating-change {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--chalk-faint);
}
.rating-change strong {
  font-size: 31px;
  font-variant-numeric: tabular-nums;
}
.rating-change .after {
  color: var(--chalk);
}
.gain {
  padding: 5px 13px;
  border: 1px solid #6fc9a350;
  border-radius: var(--radius);
  background: #6fc9a310;
  color: var(--heal);
  font-size: 13px;
  font-weight: 800;
}
.budget {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  max-width: 280px;
  padding: 21px;
  border: 1px solid #f4c55b30;
  border-radius: var(--radius);
  background: #1b2a22;
  box-shadow: 6px 6px 0 #f4c55b08;
}
.heroes {
  display: flex;
  justify-content: center;
  gap: 13px;
  margin-bottom: 4px;
}
.balance {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--chalk-dim);
  font-size: 11px;
}
.balance b {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--gold);
  font-size: 16px;
}
.balance small {
  font-size: 10px;
  color: var(--chalk-faint);
}
.budget-track {
  height: 5px;
  background: #ffffff0c;
  border-radius: 5px;
}
.budget-track i {
  display: block;
  width: 90.5%;
  height: 100%;
  background: var(--gold);
  border-radius: inherit;
}
.verified {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 7px;
  color: var(--heal);
  font-size: 12px;
  font-weight: 700;
}
.updates {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 310px;
}
.updates > div {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 17px 14px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #1a2922;
  color: var(--gold);
}
.updates > div > svg {
  flex: none;
}
.updates > div > span:not(.pulse) {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}
.updates strong {
  color: var(--chalk);
  font-size: 12px;
}
.updates small {
  color: var(--chalk-faint);
  font-size: 10px;
}
.pulse {
  display: flex;
  gap: 3px;
}
.pulse i {
  width: 4px;
  height: 14px;
  background: #6fc9a330;
  border-radius: 3px;
}
.pulse i:first-child {
  background: var(--heal);
}
.pulse.live i {
  background: var(--heal);
}
.pulse.live i:nth-child(2) {
  height: 20px;
  margin-top: -3px;
}
.check {
  color: var(--heal);
}
@media (max-width: 380px) {
  .illustration {
    padding-inline: 16px;
  }
  .queue-bar {
    gap: 7px;
  }
  .queue-bar strong {
    font-size: 11px;
  }
}
</style>
