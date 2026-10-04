<script setup lang="ts">
import {
  Bot,
  MousePointerClick,
  Play,
  ScrollText,
  Settings,
  Swords,
  Target,
  Trophy,
  User,
  Users,
} from '@lucide/vue'
import { computed } from 'vue'
import type { HeroId } from '@/content/ids'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'

/**
 * The 9.1 introduction: the new home screen held in one hand. A finger taps its way down the screen, from the match
 * waiting to be continued to the tabs at the bottom. The coach, round and contracts are a fixed example.
 */
const OURS: readonly HeroId[] = ['blademaster', 'oracle', 'herald']
const THEIRS: readonly HeroId[] = ['butcher', 'frostWitch', 'stonewright']

const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: 'Главный экран · Телефон',
        title: 'Одно касание до игры',
        intro: 'Всё важное помещается на одном экране: открыл игру — и сразу в матч',
        perks: [
          'Матч продолжается в одно касание',
          'Быстрый старт любого режима',
          'Вкладки под большим пальцем',
        ],
        coach: 'Тренер',
        rank: 'Ветеран · 1 240 MMR',
        mode: 'Три линии · против компьютера',
        round: 'Раунд 7 из 20',
        continue: 'Продолжить',
        computer: 'Компьютер',
        online: 'Онлайн',
        training: 'Тренировка',
        contracts: 'Контракты',
        next: 'Дальше: Первая кровь · 2/3',
        news: 'Патч 9.1',
        fresh: 'Новое',
        tabs: ['Игра', 'Карьера', 'Друзья', 'Профиль'],
      }
    : {
        eyebrow: 'Home screen · Phone',
        title: 'One tap to play',
        intro: 'Everything that matters fits on one screen: open the game and jump straight into a match',
        perks: ['Continue your match in one tap', 'Quick start for every mode', 'Tabs under your thumb'],
        coach: 'Coach',
        rank: 'Veteran · 1,240 MMR',
        mode: 'Three lanes · vs computer',
        round: 'Round 7 of 20',
        continue: 'Continue',
        computer: 'Computer',
        online: 'Online',
        training: 'Training',
        contracts: 'Contracts',
        next: 'Next: First blood · 2/3',
        news: 'Patch 9.1',
        fresh: 'New',
        tabs: ['Play', 'Career', 'Friends', 'Profile'],
      },
)

const quick = computed(() => [
  {
    icon: Bot,
    label: copy.value.computer,
  },
  {
    icon: Swords,
    label: copy.value.online,
  },
  {
    icon: Target,
    label: copy.value.training,
  },
])

const tabs = computed(() =>
  [Play, Trophy, Users, User].map((icon, i) => ({
    icon,
    label: copy.value.tabs[i],
  })),
)
</script>

<template>
  <section class="campaign" aria-labelledby="home-release-title">
    <header class="pitch">
      <p class="eyebrow"><MousePointerClick :size="14" /> {{ copy.eyebrow }}</p>
      <h2 id="home-release-title" class="hand">{{ copy.title }}</h2>
      <p class="intro">{{ copy.intro }}</p>

      <ol class="perks">
        <li v-for="(perk, i) in copy.perks" :key="perk">
          <span class="step">{{ i + 1 }}</span> {{ perk }}
        </li>
      </ol>
    </header>

    <div class="stage" aria-hidden="true">
      <div class="phone">
        <div class="screen">
          <div class="top">
            <span class="avatar"><HeroAvatar hero-id="warden" :size="26" /></span>

            <span class="who">
              <b>{{ copy.coach }}</b>
              <small>{{ copy.rank }}</small>
            </span>

            <Settings :size="13" class="gear" />
          </div>

          <div class="resume">
            <div class="row">
              <small>{{ copy.mode }}</small>
              <small>{{ copy.round }}</small>
            </div>

            <div class="teams">
              <span class="team">
                <HeroAvatar v-for="hero in OURS" :key="hero" :hero-id="hero" :size="22" />
              </span>

              <span class="vs">vs</span>

              <span class="team">
                <HeroAvatar v-for="hero in THEIRS" :key="hero" :hero-id="hero" :team="1" :size="22" />
              </span>
            </div>

            <span class="continue tap t1"><Play :size="11" /> {{ copy.continue }}</span>
          </div>

          <div class="quick">
            <span v-for="(tile, i) in quick" :key="tile.label" class="tile tap" :class="`t${i + 2}`">
              <component :is="tile.icon" :size="14" />
              {{ tile.label }}
            </span>
          </div>

          <div class="contracts">
            <span class="row">
              <b><Trophy :size="11" /> {{ copy.contracts }}</b>
              <b class="count">2/3</b>
            </span>

            <small>{{ copy.next }}</small>
          </div>

          <div class="news">
            <ScrollText :size="11" /> {{ copy.news }} <i>{{ copy.fresh }}</i>
          </div>

          <nav class="tabs">
            <span
              v-for="(tab, i) in tabs"
              :key="i"
              class="tab"
              :class="{ active: i === 0, 'tap t5': i === 1 }"
            >
              <component :is="tab.icon" :size="13" />
              {{ tab.label }}
            </span>
          </nav>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.campaign {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 28px;
  margin-top: 28px;
  padding: 34px 32px 0;
  border: 1px solid #f4c55b40;
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 72% 40%, #f4c55b18, transparent 55%),
    radial-gradient(ellipse at 10% 90%, #7fe0b410, transparent 45%), linear-gradient(165deg, #1c2a24, #0f1915);
  box-shadow: 0 20px 60px #0004;
}

/* Faint chalk rings behind the phone, like a tap still spreading across the board. */
.campaign::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: repeating-radial-gradient(circle at 72% 46%, transparent 0 34px, #ece8dc07 34px 36px);
  mask-image: linear-gradient(90deg, transparent 35%, #000);
}

.pitch {
  padding-bottom: 34px;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h2 {
  margin: 12px 0;
  font-size: clamp(42px, 6.4vw, 66px);
  line-height: 1.05;
}

.intro {
  max-width: 400px;
  margin: 0;
  color: var(--chalk-dim);
  font-size: 14px;
  line-height: 1.6;
}

.perks {
  display: grid;
  gap: 10px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  font-weight: 700;
}

.perks li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid #f4c55b70;
  border-radius: 50%;
  color: var(--gold);
  font-size: 12px;
}

/* The phone rises from the bottom edge of the card, cut off below the tabs. */
.stage {
  display: flex;
  justify-content: center;
  align-self: end;
}

.phone {
  width: 250px;
  padding: 10px 10px 0;
  border: 2px solid #ece8dc30;
  border-bottom: 0;
  border-radius: 30px 30px 0 0;
  background: #0b1310;
  box-shadow:
    0 -10px 50px #f4c55b14,
    0 0 0 6px #ffffff05;
  rotate: -3deg;
  translate: 0 8px;
}

.screen {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 10px 0;
  border-radius: 22px 22px 0 0;
  background: linear-gradient(180deg, #1c2a24, #13201b);
  font-size: 10px;
}

.top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--gold);
  border-radius: 50%;
}

.who {
  display: grid;
  flex: 1;
  line-height: 1.25;
}

.who small,
.contracts small {
  color: var(--chalk-faint);
  font-size: 9px;
}

.gear {
  color: var(--chalk-dim);
}

.resume {
  display: grid;
  gap: 8px;
  padding: 9px;
  border: 1px solid #f4c55b50;
  border-radius: var(--radius);
  background: #f4c55b0d;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  color: var(--chalk-dim);
}

.row small {
  font-size: 9px;
}

.teams {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.team {
  display: flex;
  gap: 2px;
}

.vs {
  color: var(--chalk-faint);
  font-size: 9px;
}

.continue {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px;
  border-radius: var(--radius);
  background: var(--gold);
  color: #1b1405;
  font-weight: 800;
}

.quick {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.tile {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 8px 2px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff06;
  font-weight: 700;
}

.tile svg {
  color: var(--gold);
}

.contracts {
  display: grid;
  gap: 4px;
  padding: 8px 9px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff04;
}

.contracts b {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--chalk);
}

.contracts .count {
  color: var(--gold);
}

.news {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 9px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  font-weight: 700;
}

.news i {
  padding: 1px 5px;
  border-radius: var(--radius);
  background: var(--gold);
  color: #1b1405;
  font-size: 8px;
  font-style: normal;
  font-weight: 800;
  text-transform: uppercase;
}

/* Attached to the bottom of the screen: square along that edge. */
.tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 4px -10px 0;
  padding: 7px 0 12px;
  border-top: 1px solid var(--edge-strong);
  background: #0f1915;
}

.tab {
  display: grid;
  justify-items: center;
  gap: 3px;
  color: var(--chalk-faint);
  font-size: 9px;
  font-weight: 700;
}

.tab.active {
  color: var(--gold);
}

/* One finger goes down the screen: each target lights up in turn, then the loop starts over. */
.tap {
  position: relative;
  animation: press 7.5s ease-out infinite;
}

.tap::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 26px;
  height: 26px;
  margin: -13px 0 0 -13px;
  border: 2px solid var(--gold);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  animation: ripple 7.5s ease-out infinite;
  animation-delay: inherit;
}

.t1 {
  animation-delay: 0s;
}

.t2 {
  animation-delay: 1.5s;
}

.t3 {
  animation-delay: 3s;
}

.t4 {
  animation-delay: 4.5s;
}

.t5 {
  animation-delay: 6s;
}

@keyframes press {
  0%,
  14%,
  100% {
    scale: 1;
    filter: none;
  }

  3% {
    scale: 0.95;
    filter: brightness(1.25);
  }
}

@keyframes ripple {
  0% {
    opacity: 0.9;
    scale: 0.4;
  }

  14%,
  100% {
    opacity: 0;
    scale: 2.2;
  }
}

@media (max-width: 760px) {
  .campaign {
    grid-template-columns: 1fr;
    padding: 28px 18px 0;
  }

  .pitch {
    padding-bottom: 0;
  }

  .phone {
    rotate: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tap,
  .tap::after {
    animation: none;
  }
}
</style>
