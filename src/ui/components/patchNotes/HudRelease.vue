<script setup lang="ts">
import { ChevronDown, Coins, Crosshair, Shield, Swords, Wand2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ModeMap from '../modes/ModeMap.vue'

// A fixed illustration of the 9.3 HUD, independent of the current match and account.
const SQUAD = ['giant', 'archer', 'acolyte'] as const
const RESERVES = ['warden', 'pyromancer'] as const

const settings = useSettingsStore()

const expanded = ref(false)

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: '9.3 / Новый интерфейс матча',
        title: 'Твой план.\nТвой отряд. Твой бой.',
        intro:
          'Поле боя выходит на первый план. Собирай состав, находи слабые места соперника и следи за тем, как твой замысел оживает на линиях.',
        show: 'Раскрыть табло в примере',
        hide: 'Свернуть табло в примере',
        round: 'Раунд 4',
        planning: 'Подготовка',
        team: 'Твой отряд',
        bench: 'Запас',
        shop: 'Подкрепление',
        lane: 'Линии',
        ready: 'К бою',
        caption: 'Меньше преград между тобой и полем боя.',
        hint: 'Нажми на золотую полоску: табло раскроется прямо в иллюстрации.',
        revealed: 'Раунд, время и состояние баз — одним взглядом. Нажми ещё раз, чтобы освободить обзор.',
      }
    : {
        eyebrow: '9.3 / The match interface, redesigned',
        title: 'Your plan.\nYour squad. Your fight.',
        intro:
          'The battlefield takes centre stage. Build your lineup, find the gaps in theirs and watch your plan come to life on the lanes.',
        show: 'Reveal the example scoreboard',
        hide: 'Hide the example scoreboard',
        round: 'Round 4',
        planning: 'Planning',
        team: 'Your squad',
        bench: 'Reserves',
        shop: 'Reinforcements',
        lane: 'Lanes',
        ready: 'To battle',
        caption: 'Less between you and the battlefield.',
        hint: 'Tap the gold handle to reveal the scoreboard in this illustration.',
        revealed: 'Round, time and base health at a glance. Tap again to clear the view.',
      },
)
</script>

<template>
  <section class="hud-release" aria-labelledby="hud-release-title">
    <div class="pitch">
      <div>
        <p class="eyebrow"><Crosshair :size="15" /> {{ copy.eyebrow }}</p>
        <h2 id="hud-release-title" class="hand">{{ copy.title }}</h2>
      </div>

      <div class="lead">
        <p>{{ copy.intro }}</p>
      </div>
    </div>

    <figure class="showcase">
      <div class="scene">
        <div class="tactical-grid" aria-hidden="true" />

        <div class="map" aria-hidden="true">
          <ModeMap mode="twoLanes" :size="460" />
          <span class="unit unit-one"><HeroAvatar hero-id="giant" :size="44" :stars="2" /></span>
          <span class="unit unit-two"><HeroAvatar hero-id="archer" :size="38" /></span>
          <span class="unit unit-three"><HeroAvatar hero-id="butcher" :team="1" :size="44" /></span>
          <span class="unit unit-four"><HeroAvatar hero-id="sniper" :team="1" :size="38" /></span>
          <Swords class="clash" :size="30" />
        </div>

        <div class="scoreboard-demo">
          <div v-show="expanded" id="hud-example-scoreboard" class="scoreboard">
            <span class="base ours"><Shield :size="19" /><b>100%</b></span>

            <div class="clock">
              <small>{{ copy.round }}</small>

              <strong>{{ copy.planning }} · 0:28</strong>

              <i />
            </div>

            <span class="base theirs"><Shield :size="19" /><b>82%</b></span>
          </div>

          <button
            type="button"
            class="handle"
            :class="{ expanded }"
            :aria-expanded="expanded"
            :aria-label="expanded ? copy.hide : copy.show"
            aria-controls="hud-example-scoreboard"
            @click="expanded = !expanded"
          >
            <ChevronDown :size="18" />
          </button>
        </div>

        <div class="squad-panel miniature" aria-hidden="true">
          <span class="panel-label">{{ copy.team }} <Shield :size="13" /></span>

          <div class="lineup">
            <HeroAvatar v-for="hero in SQUAD" :key="hero" :hero-id="hero" :size="36" />
          </div>

          <div class="lane-line">
            <i />

            <span>{{ copy.lane }}</span>

            <i />
          </div>

          <div class="synergy"><Shield :size="12" /><i /><i /></div>
          <span class="panel-label reserves">{{ copy.bench }} <Wand2 :size="13" /></span>

          <div class="lineup">
            <HeroAvatar v-for="hero in RESERVES" :key="hero" :hero-id="hero" :size="36" />
            <span class="empty-slot" />
          </div>
        </div>

        <div class="shop-panel miniature" aria-hidden="true">
          <span class="panel-label">{{ copy.shop }}</span>
          <strong class="gold"><Coins :size="16" /> 24</strong>

          <div v-for="(hero, i) in RESERVES" :key="hero" class="offer">
            <HeroAvatar :hero-id="hero" :size="34" />

            <span class="offer-lines"><i /><i /></span>

            <b>{{ i + 2 }}</b>
          </div>

          <span class="fight"><Swords :size="14" /> {{ copy.ready }}</span>
        </div>
      </div>

      <figcaption>
        <strong class="hand">{{ copy.caption }}</strong>
        <p aria-live="polite">{{ expanded ? copy.revealed : copy.hint }}</p>
      </figcaption>
    </figure>
  </section>
</template>

<style scoped>
.hud-release {
  margin-top: 34px;
  overflow: hidden;
  border: 1px solid #f4c55b40;
  border-radius: var(--radius);
  background: radial-gradient(ellipse at 10% 0, #f4c55b12, transparent 55%), #14211b;
  box-shadow: 0 24px 70px #0004;
}
.pitch {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  align-items: end;
  gap: 32px;
  padding: 40px 40px 24px;
}
.eyebrow,
.panel-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.eyebrow {
  margin: 0 0 16px;
  color: var(--gold);
}
h2 {
  margin: 0;
  font-size: clamp(40px, 5.5vw, 68px);
  line-height: 0.98;
  white-space: pre-line;
  color: var(--chalk);
}
.lead p {
  margin: 0;
  color: var(--chalk-dim);
  font-size: 15px;
  line-height: 1.7;
}
.showcase {
  margin: 0;
}
.scene {
  position: relative;
  height: 430px;
  margin: 12px 20px 0;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: radial-gradient(ellipse at 50% 50%, #375d3f70, transparent 70%), #101b16;
}
.tactical-grid {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image:
    linear-gradient(#b0c4a607 1px, transparent 1px), linear-gradient(90deg, #b0c4a607 1px, transparent 1px);
  background-size: 28px 28px;
}
.map {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 430px;
  height: 430px;
  transform: translate(-50%, -50%);
}
.map :deep(.mode-map) {
  width: 100%;
  height: 100%;
  opacity: 0.8;
}
.unit,
.clash {
  position: absolute;
}
.unit {
  filter: drop-shadow(0 6px 8px #0009);
}
.unit-one {
  left: 25%;
  top: 31%;
}
.unit-two {
  left: 17%;
  top: 43%;
}
.unit-three {
  right: 25%;
  bottom: 32%;
}
.unit-four {
  right: 17%;
  bottom: 44%;
}
.clash {
  top: 47%;
  left: 47%;
  color: var(--gold);
  opacity: 0.6;
}
.scoreboard-demo {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 50%;
  width: min(340px, calc(100% - 24px));
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.scoreboard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid #f4c55b45;
  border-top: 0;
  border-radius: 0 0 var(--radius) var(--radius);
  background: #14201af5;
  box-shadow: 0 12px 30px #0006;
}
.base,
.clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.base {
  font-size: 10px;
}
.ours {
  color: var(--ours);
}
.theirs {
  color: var(--theirs);
}
.clock {
  flex: 1;
}
.clock small {
  color: var(--chalk-dim);
  font-size: 10px;
}
.clock strong {
  color: var(--gold);
  font-family: var(--font-hand);
  font-size: 22px;
}
.clock i {
  width: 70%;
  height: 3px;
  background: var(--gold);
  border-radius: 99px;
}
.handle {
  display: grid;
  place-items: center;
  width: 110px;
  min-height: 28px;
  padding: 2px 0;
  border: 0;
  border-radius: 0 0 var(--radius) var(--radius);
  color: #18241b;
  background: var(--gold);
  box-shadow: 0 4px 24px #f4c55b25;
  cursor: pointer;
}
.handle:hover {
  background: #ffdc8c;
}
.handle.expanded svg {
  rotate: 180deg;
}
.handle:focus-visible {
  outline: 2px solid var(--chalk);
  outline-offset: 4px;
}
.miniature {
  position: absolute;
  top: 78px;
  width: 168px;
  padding: 15px;
  border: 1px solid #cdd6ba24;
  border-radius: var(--radius);
  background: #1a2821f2;
  box-shadow: 0 14px 32px #0005;
}
.squad-panel {
  left: 22px;
  rotate: -2deg;
}
.shop-panel {
  right: 22px;
  rotate: 2deg;
}
.panel-label {
  justify-content: space-between;
  font-size: 9px;
  color: var(--chalk-dim);
  letter-spacing: 0.04em;
}
.lineup {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.lane-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  font-size: 10px;
  color: var(--chalk-faint);
}
.lane-line i {
  flex: 1;
  height: 1px;
  background: var(--edge);
}
.synergy {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 12px 0;
  color: var(--ours);
}
.synergy i {
  height: 5px;
  width: 28px;
  border-radius: 99px;
  background: #8dba8438;
}
.reserves {
  border-top: 1px solid var(--edge);
  padding-top: 15px;
}
.empty-slot {
  width: 36px;
  height: 36px;
  border: 1px dashed var(--edge);
  border-radius: var(--radius);
}
.gold {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
  font-size: 22px;
  color: var(--gold);
}
.offer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.offer b {
  font-size: 11px;
  color: var(--gold);
}
.offer-lines {
  display: grid;
  flex: 1;
  gap: 7px;
}
.offer-lines i {
  height: 4px;
  background: #b0c4a62a;
  border-radius: 99px;
}
.offer-lines i + i {
  width: 65%;
}
.fight {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  padding: 9px;
  border: 1px solid #f4c55b55;
  border-radius: var(--radius);
  font-size: 11px;
  font-weight: 800;
  color: var(--gold);
}
figcaption {
  padding: 24px 24px 28px;
  text-align: center;
}
figcaption strong {
  color: var(--gold);
  font-size: 30px;
  line-height: 1.1;
}
figcaption p {
  margin: 9px auto 0;
  max-width: 540px;
  min-height: 3em;
  font-size: 12px;
  line-height: 1.5;
  color: var(--chalk-dim);
}
@media (max-width: 760px) {
  .pitch {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 28px 24px 16px;
  }
  .scene {
    height: 380px;
    margin-inline: 12px;
  }
  .map {
    width: 350px;
    height: 350px;
  }
  .miniature {
    width: 138px;
    padding: 12px;
    top: 90px;
  }
  .lineup {
    gap: 6px;
  }
  .lineup :deep(.avatar) {
    width: 30px;
    height: 30px;
  }
  .squad-panel {
    left: 12px;
  }
  .shop-panel {
    right: 12px;
  }
}
@media (max-width: 540px) {
  .scene {
    height: 400px;
  }
  .map {
    top: 45%;
    width: 320px;
    height: 320px;
  }
  .miniature {
    top: auto;
    bottom: 40px;
    width: auto;
    padding: 10px;
    rotate: 0deg;
  }
  .squad-panel {
    left: 10px;
  }
  .shop-panel {
    right: 10px;
  }
  .squad-panel .panel-label:not(.reserves),
  .squad-panel > .lineup:first-of-type,
  .lane-line,
  .synergy,
  .shop-panel .offer,
  .shop-panel .fight {
    display: none;
  }
  .reserves {
    padding: 0;
    border: 0;
  }
  .lineup {
    margin-top: 10px;
  }
  .gold {
    margin: 7px 0 0;
  }
  figcaption strong {
    font-size: 26px;
  }
}
</style>
