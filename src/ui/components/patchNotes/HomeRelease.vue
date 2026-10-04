<script setup lang="ts">
import { Monitor, MousePointerClick, Pause, Play, Smartphone } from '@lucide/vue'
import { useDocumentVisibility, useElementVisibility, useIntervalFn, useMediaQuery } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'
import type { FeatureArt as Art } from '../../patchNotes/notes'
import { useSettingsStore } from '../../stores/settings'
import FeatureArt from './FeatureArt.vue'

const STEPS = [
  {
    kind: 'home',
    device: 'desktop',
    scene: 'home',
  },
  {
    kind: 'home',
    device: 'desktop',
    scene: 'chat',
  },
  {
    kind: 'home',
    device: 'desktop',
    scene: 'career',
  },
  {
    kind: 'home',
    device: 'phone',
    scene: 'home',
  },
  {
    kind: 'home',
    device: 'phone',
    scene: 'career',
  },
  {
    kind: 'home',
    device: 'phone',
    scene: 'chat',
  },
] as const satisfies readonly Art[]

const settings = useSettingsStore()
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const visibility = useDocumentVisibility()
const host = useTemplateRef<HTMLElement>('host')
const visible = useElementVisibility(host)
const step = ref(0)
const paused = ref(false)

const art = computed(() => STEPS[step.value]!)

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: 'Главный экран',
        title: 'Твой следующий ход',
        intro:
          'Вернись в свой матч, найди компанию или выбери новую цель. Главное меню стало отправной точкой для всего, во что хочется играть.',
        perks: [
          'Продолжай матч с того же раунда',
          'Приглашай друзей и смотри их матчи',
          'Выбирай испытания и закрывай контракты',
        ],
        desktop: 'Компьютер',
        phone: 'Телефон',
        pause: 'Остановить показ',
        play: 'Продолжить показ',
        sample: 'Сцены главного экрана',
        scenes: ['Продолжи матч', 'Друзья рядом', 'Новая цель'],
        captions: [
          'Твой отряд уже ждёт. Продолжи матч или попробуй другой режим.',
          'Узнай, кто готов играть. Открой чат или загляни в матч друга.',
          'Следующее испытание — ещё один повод собрать новый отряд.',
          'Продолжение матча и быстрый старт — в одно касание.',
          'Перейди к испытаниям через вкладку карьеры.',
          'Переключись на друзей и продолжи разговор, когда захочешь.',
        ],
      }
    : {
        eyebrow: 'Home screen',
        title: 'Your next move',
        intro:
          'Return to your match, find company or pick a new goal. The main menu is your starting point for everything you want to play.',
        perks: [
          'Continue from the same round',
          'Meet your friends and watch their matches',
          'Take on trials and finish contracts',
        ],
        desktop: 'Computer',
        phone: 'Phone',
        pause: 'Pause preview',
        play: 'Resume preview',
        sample: 'Home screen scenes',
        scenes: ['Continue your match', 'Friends nearby', 'A new goal'],
        captions: [
          'Your squad is waiting. Continue your match or try another mode.',
          'See who is ready to play. Open a chat or watch a friend’s match.',
          'Your next trial is another reason to build a new squad.',
          'Continue a match or start a new one with a single tap.',
          'Explore your trials through the Career tab.',
          'Switch to Friends and join the conversation when you choose.',
        ],
      },
)

function selectStep(index: number) {
  step.value = index
  paused.value = true
}

useIntervalFn(() => {
  if (paused.value || reducedMotion.value || !visible.value || visibility.value !== 'visible') {
    return
  }

  step.value = (step.value + 1) % STEPS.length
}, 3500)
</script>

<template>
  <section ref="host" class="campaign" aria-labelledby="home-release-title">
    <header class="pitch">
      <p class="eyebrow"><MousePointerClick :size="14" /> {{ copy.eyebrow }}</p>
      <h2 id="home-release-title" class="hand">{{ copy.title }}</h2>
      <p class="intro">{{ copy.intro }}</p>

      <ol class="perks">
        <li v-for="(perk, i) in copy.perks" :key="perk">
          <span>{{ i + 1 }}</span
          >{{ perk }}
        </li>
      </ol>
    </header>

    <div class="showcase">
      <div class="controls">
        <button type="button" :aria-pressed="art.device === 'desktop'" @click="selectStep(0)">
          <Monitor :size="15" /> {{ copy.desktop }}
        </button>

        <button type="button" :aria-pressed="art.device === 'phone'" @click="selectStep(3)">
          <Smartphone :size="15" /> {{ copy.phone }}
        </button>

        <button
          v-if="!reducedMotion"
          type="button"
          class="pause"
          :aria-label="paused ? copy.play : copy.pause"
          @click="paused = !paused"
        >
          <Play v-if="paused" :size="15" /><Pause v-else :size="15" />
        </button>
      </div>

      <div class="stage">
        <FeatureArt
          v-for="device in ['desktop', 'phone'] as const"
          :key="device"
          v-show="art.device === device"
          :art="{ kind: 'home', device, scene: art.device === device ? art.scene : 'home' }"
          class="picture"
          :class="{ active: art.device === device }"
        />
      </div>

      <p class="caption">{{ copy.captions[step] }}</p>

      <div class="steps" :aria-label="copy.sample">
        <button
          v-for="(item, i) in STEPS"
          :key="i"
          type="button"
          :aria-label="`${item.device === 'desktop' ? copy.desktop : copy.phone}: ${copy.scenes[item.scene === 'home' ? 0 : item.scene === 'chat' ? 1 : 2]}`"
          :aria-pressed="step === i"
          @click="selectStep(i)"
        >
          <span />
        </button>
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
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 28px;
  margin-top: 28px;
  padding: 34px 30px;
  border: 1px solid #f4c55b40;
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 80% 35%, #f4c55b18, transparent 55%),
    radial-gradient(ellipse at 5% 90%, #7fe0b410, transparent 45%), linear-gradient(165deg, #1c2a24, #0f1915);
  box-shadow: 0 20px 60px #0004;
}
.campaign::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: repeating-radial-gradient(circle at 78% 46%, transparent 0 34px, #ece8dc07 34px 36px);
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
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
h2 {
  margin: 14px 0;
  font-size: clamp(42px, 6vw, 64px);
  line-height: 1.05;
}
.intro {
  margin: 0;
  color: var(--chalk-dim);
  font-size: 14px;
  line-height: 1.6;
}
.perks {
  display: grid;
  gap: 13px;
  margin: 24px 0 0;
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
.perks span {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  border: 1px solid #f4c55b70;
  border-radius: 50%;
  color: var(--gold);
  font-size: 12px;
}
.showcase {
  min-width: 0;
}
.controls {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 18px;
}
.controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #ffffff05;
  color: var(--chalk-dim);
  font-size: 11px;
  cursor: pointer;
}
.controls [aria-pressed='true'] {
  border-color: #f4c55b70;
  color: var(--gold);
  background: #f4c55b12;
}
.controls .pause {
  padding: 6px 9px;
}
.stage {
  display: grid;
  align-items: center;
  height: 400px;
  position: relative;
}
.stage > .picture {
  position: absolute;
  inset: 0;
  height: 100%;
  aspect-ratio: auto;
  width: 100%;
  padding: 0;
  background: none;
  overflow: visible;
}
.picture.active {
  animation: device-in 0.3s ease-out;
}
@keyframes device-in {
  from {
    opacity: 0;
    scale: 0.96;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
.caption {
  min-height: 72px;
  margin: 14px auto 8px;
  max-width: 390px;
  text-align: center;
  font-size: 12px;
  line-height: 1.5;
  color: var(--chalk-dim);
}
.steps {
  display: flex;
  justify-content: center;
  gap: 4px;
}
.steps button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: none;
  cursor: pointer;
}
.steps span {
  width: 15px;
  height: 3px;
  border-radius: 999px;
  background: var(--edge-strong);
}
.steps [aria-pressed='true'] span {
  background: var(--gold);
}
@media (max-width: 760px) {
  .campaign {
    grid-template-columns: minmax(0, 1fr);
    padding: 28px 18px;
  }
  .pitch {
    max-width: 520px;
  }
  .showcase {
    width: 100%;
    max-width: 520px;
    justify-self: center;
  }
}
@media (prefers-reduced-motion: reduce) {
  .stage > .picture {
    animation: none;
  }
}
</style>
