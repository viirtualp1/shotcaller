<script setup lang="ts">
import { Search, Swords } from '@lucide/vue'
import { computed } from 'vue'
import { vOpticalAlign } from '../../directives/opticalAlign'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import RankMedal from '../profile/RankMedal.vue'

const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: 'Рейтинговый поиск соперника',
        title: 'Отряд против отряда',
        intro: 'Найди соперника, проверь свою стратегию и поборись за следующий ранг',
        you: 'Твой отряд',
        opponent: 'Твой следующий вызов',
        modes: 'Одна, две или три линии',
        waiting: 'Выбирай поле боя. Мы найдём соперника',
      }
    : {
        eyebrow: 'Ranked matchmaking',
        title: 'Squad against squad',
        intro: 'Find an opponent, test your strategy and fight for your next rank',
        you: 'Your squad',
        opponent: 'Your next challenge',
        modes: 'One, two or three lanes',
        waiting: 'Choose your battlefield. We’ll find your opponent',
      },
)
</script>

<template>
  <section class="campaign" aria-labelledby="matchmaking-release-title">
    <header class="pitch">
      <p class="eyebrow"><Swords :size="14" /> {{ copy.eyebrow }}</p>
      <h2 id="matchmaking-release-title" class="hand">{{ copy.title }}</h2>
      <p class="intro">{{ copy.intro }}</p>
    </header>

    <div class="arena" aria-hidden="true">
      <div class="team ours">
        <span class="team-label">{{ copy.you }}</span>

        <div class="squad">
          <HeroAvatar hero-id="archer" :size="54" class="support first" />
          <HeroAvatar hero-id="giant" :size="94" :stars="2" class="captain" />
          <HeroAvatar hero-id="acolyte" :size="54" class="support last" />
        </div>

        <span class="rank"><RankMedal tier="strategist" :stars="3" :size="30" /><i /><i /><i /></span>
      </div>

      <div class="versus">
        <Swords :size="25" />
        <strong v-optical-align:center class="hand">VS</strong>
      </div>

      <div class="team theirs">
        <span class="team-label">{{ copy.opponent }}</span>

        <div class="squad">
          <HeroAvatar hero-id="pyromancer" :team="1" :size="54" class="support first" />
          <HeroAvatar hero-id="blademaster" :team="1" :size="94" :stars="2" class="captain" />
          <HeroAvatar hero-id="warden" :team="1" :size="54" class="support last" />
        </div>

        <span class="rank"><i /><i /><i /><RankMedal tier="strategist" :stars="3" :size="30" /></span>
      </div>
    </div>

    <footer class="invitation">
      <span>{{ copy.modes }}</span>
      <p><Search :size="14" /> {{ copy.waiting }}</p>
    </footer>
  </section>
</template>

<style scoped>
.campaign {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  margin-top: 28px;
  padding: 32px 28px 24px;
  border: 1px solid #f4c55b40;
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 15% 65%, #6cc4c41c, transparent 48%),
    radial-gradient(ellipse at 85% 65%, #e986681a, transparent 48%), linear-gradient(180deg, #1d2c24, #101a17);
  box-shadow: 0 20px 60px #0004;
}
.campaign::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(112deg, transparent 49.8%, #f4c55b12 50%, transparent 50.2%);
}
.pitch {
  text-align: center;
}
.eyebrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 0;
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
h2 {
  margin: 14px 0 12px;
  font-size: clamp(36px, 6vw, 64px);
  line-height: 1.1;
}
.intro {
  max-width: 530px;
  margin: 0 auto;
  color: var(--chalk-dim);
  font-size: 14px;
  line-height: 1.6;
}
.arena {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 20px;
  padding: 32px 16px 26px;
}
.team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  min-width: 0;
}
.team-label {
  color: var(--ours);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.theirs .team-label {
  color: var(--theirs);
}
.squad {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 0;
}
.squad::before {
  content: '';
  position: absolute;
  width: 160px;
  height: 160px;
  border: 1px solid #6cc4c420;
  border-radius: 50%;
  box-shadow:
    0 0 0 20px #6cc4c404,
    0 0 50px #6cc4c410;
}
.theirs .squad::before {
  border-color: #e9866820;
  box-shadow:
    0 0 0 20px #e9866804,
    0 0 50px #e9866810;
}
.captain {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 10px 18px #0007);
}
.support {
  opacity: 0.7;
}
.first {
  translate: 4px -10px;
  rotate: -8deg;
}
.last {
  translate: -4px 10px;
  rotate: 8deg;
}
.theirs .first {
  translate: 4px 10px;
}
.theirs .last {
  translate: -4px -10px;
}
.rank {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--gold);
}
.rank i {
  width: 14px;
  height: 3px;
  border-radius: 3px;
  background: #6cc4c450;
}
.theirs .rank i {
  background: #e9866850;
}
.versus {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: var(--gold);
}
.versus strong {
  font-size: 72px;
  line-height: 1;
  rotate: -8deg;
  text-shadow: 0 4px 22px #f4c55b28;
}
.versus > span {
  margin-top: 9px;
  padding: 5px 10px;
  border: 1px solid #f4c55b30;
  border-radius: 20px;
  font-size: 10px;
  white-space: nowrap;
}
.invitation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding-top: 20px;
  border-top: 1px solid var(--edge);
}
.invitation > span {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--chalk);
}
.invitation p {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: var(--chalk-faint);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}
.invitation svg {
  flex: none;
  color: var(--gold);
}
@media (max-width: 640px) {
  .campaign {
    padding: 28px 18px 22px;
  }
  .arena {
    gap: 5px;
    padding: 30px 0 22px;
  }
  .team {
    gap: 14px;
  }
  .team-label {
    min-height: 28px;
    display: flex;
    align-items: center;
    text-align: center;
    font-size: 9px;
    line-height: 1.5;
  }
  .squad {
    gap: 0;
  }
  .captain {
    --size: 64px !important;
  }
  .support {
    --size: 32px !important;
  }
  .squad::before {
    width: 94px;
    height: 94px;
  }
  .versus strong {
    font-size: 46px;
  }
  .versus > span {
    padding: 4px 7px;
    font-size: 9px;
  }
  .rank {
    gap: 3px;
  }
  .rank i {
    width: 8px;
  }
}
@media (max-width: 380px) {
  .support {
    display: none;
  }
  .intro {
    font-size: 13px;
  }
  .invitation p {
    font-size: 11px;
  }
}
</style>
