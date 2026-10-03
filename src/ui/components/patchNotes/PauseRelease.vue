<script setup lang="ts">
import { Pause, Play, Swords, Timer } from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'

/**
 * The 8.9 introduction: a duel frozen mid-clash. Both heroes hold still around the pause, and each coach keeps track of
 * the pauses left. The clock and the spent pauses are a fixed example, not anyone's match.
 */
const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: 'Дуэли · Общая пауза',
        title: 'Передышка',
        intro:
          'Нужна минутка? Останови дуэль для обоих: бой и таймер замирают, пока кто-то не нажмёт «Продолжить»',
        perPlayer: '2 паузы на дуэль',
        resume: 'Снять можно через 10 с',
        cap: 'Сама снимется через 60 с',
        paused: 'Пауза',
        resumes: 'Продолжится через',
        you: 'Ты',
        rival: 'Соперник',
      }
    : {
        eyebrow: 'Duels · Shared pause',
        title: 'Take a breather',
        intro:
          'Need a moment? Freeze the duel for both of you: the battle and the clock hold still until someone resumes',
        perPlayer: '2 pauses per duel',
        resume: 'Resume after 10 s',
        cap: 'Back on its own in 60 s',
        paused: 'Paused',
        resumes: 'Resumes in',
        you: 'You',
        rival: 'Rival',
      },
)
</script>

<template>
  <section class="campaign" aria-labelledby="pause-release-title">
    <header class="pitch">
      <p class="eyebrow"><Pause :size="14" /> {{ copy.eyebrow }}</p>
      <h2 id="pause-release-title" class="hand">{{ copy.title }}</h2>
      <p class="intro">{{ copy.intro }}</p>

      <ul class="perks">
        <li><Pause :size="15" /> {{ copy.perPlayer }}</li>
        <li><Play :size="15" /> {{ copy.resume }}</li>
        <li><Timer :size="15" /> {{ copy.cap }}</li>
      </ul>
    </header>

    <div class="standoff" aria-hidden="true">
      <div class="side ours">
        <HeroAvatar hero-id="blademaster" :size="86" :stars="2" class="fighter" />
        <span class="coach">{{ copy.you }}</span>
        <span class="tokens"><i class="spent" /><i /></span>
      </div>

      <div class="clock">
        <span class="ring" />

        <span class="face">
          <Pause :size="34" />
          <strong class="hand">{{ copy.paused }}</strong>
        </span>

        <span class="countdown"> {{ copy.resumes }} <b>0:42</b> </span>
      </div>

      <div class="side theirs">
        <HeroAvatar hero-id="butcher" :team="1" :size="86" :stars="2" class="fighter" />
        <span class="coach">{{ copy.rival }}</span>
        <span class="tokens"><i /><i /></span>
      </div>

      <Swords :size="22" class="clash" />
    </div>
  </section>
</template>

<style scoped>
.campaign {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
  gap: 28px;
  margin-top: 28px;
  padding: 34px 32px;
  border: 1px solid #f4c55b40;
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 70% 50%, #f4c55b14, transparent 55%),
    radial-gradient(ellipse at 8% 90%, #7fe0b410, transparent 45%), linear-gradient(165deg, #1c2a24, #0f1915);
  box-shadow: 0 20px 60px #0004;
}

/* Chalk tally marks along the edge, like a referee's slate. */
.campaign::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: repeating-linear-gradient(115deg, transparent 0 26px, #ece8dc06 26px 28px);
  mask-image: linear-gradient(90deg, transparent 30%, #000);
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
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.perks li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff06;
  font-size: 12px;
  font-weight: 700;
}

.perks li:first-child {
  border-color: #f4c55b70;
  color: var(--gold);
}

.standoff {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  min-height: 250px;
}

.side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* Held mid-swing: the colour drains a little while the duel stands still. */
.fighter {
  filter: saturate(0.75) brightness(0.92);
}

/* The stars sit on the portrait's lower edge, centred: half on the disc, half below it. */
.fighter :deep(.stars) {
  bottom: 0;
  left: 50%;
  translate: -50% 50%;
  line-height: 1;
}

/* The lower half of the stars hangs below the portrait; the name starts under it. */
.coach {
  margin-top: 8px;
  color: var(--chalk-dim);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tokens {
  display: flex;
  gap: 6px;
}

.tokens i {
  width: 18px;
  height: 18px;
  border: 2px solid var(--gold);
  border-radius: 50%;
  background: radial-gradient(circle, #f4c55b 0 35%, transparent 38%);
}

.tokens i.spent {
  border-color: var(--edge-strong);
  background: none;
}

.clock {
  position: relative;
  display: grid;
  place-items: center;
  width: 150px;
  height: 150px;
}

/* Seventy percent of the minute left, drawn in gold chalk. */
.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(var(--gold) 0 70%, #ece8dc14 70% 100%);
  mask: radial-gradient(circle, transparent 62%, #000 63%);
  animation: breathe 2.4s ease-in-out infinite;
}

.face {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--gold);
}

.face strong {
  font-size: 30px;
  line-height: 1;
}

.countdown {
  position: absolute;
  top: calc(100% + 10px);
  white-space: nowrap;
  color: var(--chalk-faint);
  font-size: 11px;
}

.countdown b {
  color: var(--chalk);
  font-variant-numeric: tabular-nums;
}

.clash {
  position: absolute;
  top: 18px;
  left: 50%;
  translate: -50% 0;
  color: var(--chalk-faint);
}

@keyframes breathe {
  50% {
    opacity: 0.6;
  }
}

@media (max-width: 760px) {
  .campaign {
    grid-template-columns: 1fr;
    padding: 28px 18px 30px;
  }

  .standoff {
    min-height: 220px;
  }

  .clock {
    width: 120px;
    height: 120px;
  }

  .face strong {
    font-size: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ring {
    animation: none;
  }
}
</style>
