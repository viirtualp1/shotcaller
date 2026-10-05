<script setup lang="ts">
import { ArrowUpRight, BadgeCheck, Gamepad2, Globe, Maximize2, MonitorPlay, Trophy, X } from '@lucide/vue'
import { computed } from 'vue'
import { usePatchNotesStore } from '../../stores/patchNotes'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ModeMap from '../modes/ModeMap.vue'
import RankMedal from '../profile/RankMedal.vue'

const settings = useSettingsStore()
const notes = usePatchNotesStore()

// Release illustrations are historical examples, not the player's current progress.
const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: 'Steam · Достижения · Один аккаунт',
        title: 'Твой тренер.\nТвоя библиотека.',
        intro:
          'The Shotcaller готовится к выходу в Steam. Та же игра — в собственном окне, с достижениями и твоим аккаунтом. Каждый матч, сыгранный сейчас, уже идёт в зачёт.',
        achievements: 'достижений Steam',
        places: 'места для игры: сайт, Discord, Steam',
        account: 'аккаунт для всех',
        play: 'Играть сейчас',
        sample: 'Пример',
        tab: 'Вкладка браузера',
        round: 'Раунд 7 из 20 · Подготовка',
        signedIn: 'Вход через Steam',
        level: 'Уровень 12',
        unlocked: 'Достижение получено',
        achievement: 'Разрушитель тронов',
        fullscreen: 'Весь экран',
        overlay: 'Оверлей Steam',
      }
    : {
        eyebrow: 'Steam · Achievements · One account',
        title: 'Your coach.\nYour library.',
        intro:
          'The Shotcaller is getting ready for Steam. The same game, in a window of its own, with achievements and your account along for the ride. Every match you play now already counts.',
        achievements: 'Steam achievements',
        places: 'places to play: web, Discord, Steam',
        account: 'account for all of them',
        play: 'Play now',
        sample: 'Sample',
        tab: 'Browser tab',
        round: 'Round 7 of 20 · Planning',
        signedIn: 'Signed in with Steam',
        level: 'Level 12',
        unlocked: 'Achievement unlocked',
        achievement: 'Throne breaker',
        fullscreen: 'Full screen',
        overlay: 'Steam overlay',
      },
)
</script>

<template>
  <section class="campaign" aria-labelledby="steam-release-title">
    <div class="pitch">
      <p class="eyebrow"><Gamepad2 :size="14" /> {{ copy.eyebrow }}</p>
      <h2 id="steam-release-title" class="hand">{{ copy.title }}</h2>
      <p class="intro">{{ copy.intro }}</p>

      <dl class="counts">
        <div>
          <dt><Trophy :size="16" /> 16</dt>
          <dd>{{ copy.achievements }}</dd>
        </div>

        <div>
          <dt><MonitorPlay :size="16" /> 3</dt>
          <dd>{{ copy.places }}</dd>
        </div>

        <div>
          <dt><BadgeCheck :size="16" /> 1</dt>
          <dd>{{ copy.account }}</dd>
        </div>
      </dl>

      <a href="/" class="play-link" @click.prevent="notes.close()">
        {{ copy.play }} <ArrowUpRight :size="18" />
      </a>
    </div>

    <!-- A picture of the Steam version: the browser tab lifts away and the game fills the screen. -->
    <div class="stage" aria-hidden="true">
      <div class="tab">
        <span class="tab-name"><Globe :size="12" /> {{ copy.tab }}</span>
        <X :size="12" />
        <span class="address">theshotcaller.online</span>
      </div>

      <div class="screen">
        <span class="sample">{{ copy.sample }}</span>

        <div class="hud">
          <span class="round">{{ copy.round }}</span>

          <span class="signed">
            <BadgeCheck :size="13" />
            {{ copy.signedIn }}
          </span>
        </div>

        <div class="field">
          <ModeMap mode="twoLanes" :size="170" class="board" />

          <div class="squad">
            <HeroAvatar hero-id="giant" :team="0" :stars="2" :size="36" />
            <HeroAvatar hero-id="archer" :team="0" :stars="3" :size="36" />
            <HeroAvatar hero-id="acolyte" :team="0" :stars="1" :size="36" />
          </div>
        </div>

        <div class="status">
          <div class="coach">
            <RankMedal tier="strategist" :stars="3" :size="34" />

            <span>
              <b>{{ copy.level }}</b>
              <small>1 240 MMR</small>
            </span>
          </div>

          <div class="toast">
            <span class="trophy"><Trophy :size="20" /></span>

            <span>
              <small>{{ copy.unlocked }}</small>
              <b>{{ copy.achievement }}</b>
            </span>
          </div>
        </div>

        <div class="keys">
          <span><kbd>F11</kbd> {{ copy.fullscreen }}</span>
          <span><kbd>Shift</kbd>+<kbd>Tab</kbd> {{ copy.overlay }}</span>
        </div>

        <Maximize2 :size="14" class="corner" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.campaign {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 36px;
  margin-top: 28px;
  padding: 36px;
  border: 1px solid color-mix(in srgb, var(--gold) 35%, var(--edge));
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 85% 20%, #6cc4ff14, transparent 60%),
    radial-gradient(ellipse at 0% 100%, #f4c55b14, transparent 60%),
    linear-gradient(150deg, #23302a, #0f1815 85%);
  box-shadow: 0 20px 60px #0004;
}

.campaign::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background-image: radial-gradient(#f4c55b10 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(270deg, #000, transparent 70%);
}

.pitch {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gold);
}

h2 {
  margin: 18px 0 12px;
  font-size: clamp(38px, 5vw, 56px);
  line-height: 1;
  white-space: pre-line;
  color: var(--chalk);
}

.intro {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--chalk-dim);
}

.counts {
  display: flex;
  gap: 22px;
  margin: 24px 0;
}

.counts div {
  flex: 1;
}

dt {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gold);
  font-size: 27px;
  font-weight: 800;
}

dd {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--chalk-dim);
}

.play-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: auto;
  padding: 12px 18px;
  border-radius: var(--radius);
  background: var(--gold);
  color: #15201a;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  transition: background 0.2s;
}

.play-link:hover {
  background: #ffda86;
}

.play-link:focus-visible {
  outline: 2px solid var(--chalk);
  outline-offset: 4px;
}

.stage {
  position: relative;
  align-self: center;
  min-width: 0;
  padding-top: 34px;
}

/* The browser chrome the Steam version leaves behind, tilted off the top of the screen. */
.tab {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 6%;
  right: 22%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px dashed var(--edge-strong);
  border-radius: var(--radius) var(--radius) 0 0;
  background: #1a2420;
  color: var(--chalk-dim);
  font-size: 10px;
  transform: rotate(-4deg) translateY(-10px);
  box-shadow: 0 10px 20px #0006;
}

.tab-name {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  text-decoration: line-through;
}

.address {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: var(--radius);
  background: #ffffff08;
  text-decoration: line-through;
}

.screen {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 12px;
  padding: 14px;
  border: 1px solid #f4c55b45;
  border-radius: var(--radius);
  background: radial-gradient(ellipse 70% 60% at 50% 50%, #f4c55b14, transparent 70%), var(--board-deep);
  box-shadow:
    0 0 0 6px #0b1310,
    0 24px 50px #0007,
    0 0 70px #6cc4ff12;
}

.sample {
  position: absolute;
  top: -10px;
  right: 14px;
  padding: 2px 8px;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.hud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
}

.round {
  font-weight: 700;
  color: var(--chalk-dim);
}

.signed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border: 1px solid #6cc4ff55;
  border-radius: var(--radius);
  background: #6cc4ff14;
  color: var(--ours);
  font-weight: 700;
}

.field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.board {
  opacity: 0.9;
}

.squad {
  display: flex;
  gap: 6px;
}

.status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.coach {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 6px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #1f2b27e6;
}

.coach b,
.toast b {
  display: block;
  font-size: 12px;
  color: var(--chalk);
}

.coach small,
.toast small {
  display: block;
  font-size: 10px;
  color: var(--chalk-dim);
}

/* The achievement slides in at the corner, the way the Steam overlay shows one. */
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px 9px 9px;
  border: 1px solid #f4c55b80;
  border-radius: var(--radius);
  background: linear-gradient(135deg, #2b3a2f, #17221d);
  box-shadow:
    0 12px 28px #0008,
    0 0 26px #f4c55b26;
  animation: arrive 6s ease-in-out infinite;
}

.toast small {
  color: var(--gold);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.trophy {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
}

.keys {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 10px;
  color: var(--chalk-faint);
}

kbd {
  display: inline-block;
  min-width: 22px;
  padding: 1px 5px;
  border: 1px solid var(--edge-strong);
  border-bottom-width: 2px;
  border-radius: var(--radius);
  background: #ffffff0a;
  color: var(--chalk);
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 700;
  text-align: center;
}

.corner {
  position: absolute;
  right: 12px;
  bottom: 14px;
  color: var(--chalk-faint);
}

@keyframes arrive {
  0%,
  8% {
    opacity: 0;
    transform: translateY(14px);
  }

  16%,
  84% {
    opacity: 1;
    transform: translateY(0);
  }

  100% {
    opacity: 0;
    transform: translateY(14px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }
}

@media (max-width: 760px) {
  .campaign {
    grid-template-columns: 1fr;
    padding: 26px;
    gap: 28px;
  }

  .counts {
    gap: 16px;
  }
}

@media (max-width: 420px) {
  .campaign {
    padding: 20px;
  }

  .address {
    display: none;
  }
}
</style>
