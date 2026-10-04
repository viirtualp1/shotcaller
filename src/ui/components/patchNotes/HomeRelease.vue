<script setup lang="ts">
import { Pause, Play, Sparkles } from '@lucide/vue'
import {
  useDocumentVisibility,
  useElementSize,
  useElementVisibility,
  useIntervalFn,
  useMediaQuery,
} from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HomeFeatureArt from './HomeFeatureArt.vue'

type Scene = 'home' | 'chat' | 'career'

interface Placement {
  readonly left: number
  readonly top: number
  readonly scale: number
}

const SCENES: readonly Scene[] = ['home', 'chat', 'career']

/* How long each scene stays on screen, and how often its progress bar moves. */
const SCENE_MS = 6000
const TICK_MS = 100

/* The drawn size of each device, frame and stand included. */
const DESKTOP = {
  width: 700,
  height: 464,
}

const PHONE = {
  width: 248,
  height: 512,
}

/* Side by side the phone stands in front of the monitor's frame, lower down, clear of the friends list. */
const PHONE_OVERLAP = 22
const PHONE_DROP = 70
const SIDE_BY_SIDE = DESKTOP.width + PHONE.width - PHONE_OVERLAP

/* Below this width the monitor fills the row and the phone stands in front of its lower left. */
const STACKED_BELOW = 760

const settings = useSettingsStore()
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const visibility = useDocumentVisibility()
const host = useTemplateRef<HTMLElement>('host')
const stage = useTemplateRef<HTMLElement>('stage')
const visible = useElementVisibility(host)
const { width: stageWidth } = useElementSize(stage)
const step = ref(0)
const elapsed = ref(0)
const paused = ref(false)

const scene = computed(() => SCENES[step.value]!)

const playing = computed(
  () => !paused.value && !reducedMotion.value && visible.value && visibility.value === 'visible',
)

/* A chosen scene, or one shown without motion, keeps a full bar. */
const progress = computed(() => (paused.value || reducedMotion.value ? 1 : elapsed.value / SCENE_MS))

/* Both devices scale as pictures, so the menus inside keep their proportions at any page width. */
const layout = computed(() => {
  const width = stageWidth.value || SIDE_BY_SIDE

  if (width >= STACKED_BELOW) {
    const scale = Math.min(1, width / SIDE_BY_SIDE)
    const left = (width - SIDE_BY_SIDE * scale) / 2

    return {
      height: Math.max(DESKTOP.height, PHONE_DROP + PHONE.height) * scale,
      desktop: {
        left,
        top: 0,
        scale,
      } satisfies Placement,
      phone: {
        left: left + (DESKTOP.width - PHONE_OVERLAP) * scale,
        top: PHONE_DROP * scale,
        scale,
      } satisfies Placement,
    }
  }

  const desktop = Math.min(1, width / DESKTOP.width)
  const phone = Math.min(1, (width * 0.6) / PHONE.width)
  const left = (width - DESKTOP.width * desktop) / 2
  const top = DESKTOP.height * desktop * 0.36

  return {
    height: Math.max(DESKTOP.height * desktop, top + PHONE.height * phone),
    desktop: {
      left,
      top: 0,
      scale: desktop,
    } satisfies Placement,
    phone: {
      left,
      top,
      scale: phone,
    } satisfies Placement,
  }
})

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: 'Новое главное меню',
        title: 'Твой следующий ход',
        intro:
          'Вернись в свой матч, найди компанию или выбери новую цель. Главное меню теперь начинается с того, во что хочется сыграть, — на компьютере и на телефоне.',
        sample: 'Пример главного меню на компьютере и телефоне',
        chapters: 'Что нового в меню',
        pause: 'Остановить показ',
        play: 'Продолжить показ',
        scenes: [
          {
            title: 'Назад в одно касание',
            text: 'Незаконченный матч ждёт первым — с режимом, раундом и башнями. Или начни новый с **быстрого старта**.',
          },
          {
            title: 'Друзья рядом',
            text: 'Смотри, кто в сети, отвечай в чате и **смотри матчи друзей вживую** в один клик.',
          },
          {
            title: 'Новая цель',
            text: 'Испытания карьеры и **недельные контракты** под рукой: каждый матч приближает следующую награду.',
          },
        ],
      }
    : {
        eyebrow: 'A new main menu',
        title: 'Your next move',
        intro:
          'Return to your match, find company or pick a new goal. The main menu now starts with what you want to play, on a computer and on a phone.',
        sample: 'Sample main menu on a computer and a phone',
        chapters: 'What is new in the menu',
        pause: 'Pause preview',
        play: 'Resume preview',
        scenes: [
          {
            title: 'Back in one tap',
            text: 'Your unfinished match comes first, with its mode, round and towers. Or start a new one with **quick start**.',
          },
          {
            title: 'Friends nearby',
            text: 'See who is online, answer a chat and **watch friends’ matches live** in one click.',
          },
          {
            title: 'A new goal',
            text: 'Career trials and **weekly contracts** are close at hand: every match brings your next reward closer.',
          },
        ],
      },
)

function selectScene(index: number) {
  step.value = index
  elapsed.value = 0
  paused.value = true
}

function tick() {
  if (!playing.value) {
    return
  }

  elapsed.value += TICK_MS

  if (elapsed.value < SCENE_MS) {
    return
  }

  elapsed.value = 0
  step.value = (step.value + 1) % SCENES.length
}

function placed({ left, top, scale }: Placement) {
  return {
    left: `${left}px`,
    top: `${top}px`,
    scale: String(scale),
  }
}

function highlighted(text: string) {
  return text.split('**')
}

useIntervalFn(tick, TICK_MS)
</script>

<template>
  <section ref="host" class="campaign" aria-labelledby="home-release-title">
    <header class="pitch">
      <div>
        <p class="eyebrow"><Sparkles :size="14" /> {{ copy.eyebrow }}</p>
        <h2 id="home-release-title" class="hand">{{ copy.title }}</h2>
      </div>

      <p class="intro">{{ copy.intro }}</p>
    </header>

    <div
      ref="stage"
      class="stage"
      role="img"
      :aria-label="copy.sample"
      :style="{ height: `${layout.height}px` }"
    >
      <HomeFeatureArt class="device" device="desktop" :scene="scene" :style="placed(layout.desktop)" />
      <HomeFeatureArt class="device" device="phone" :scene="scene" :style="placed(layout.phone)" />
    </div>

    <div class="chapters" :aria-label="copy.chapters">
      <button
        v-for="(item, i) in copy.scenes"
        :key="item.title"
        type="button"
        class="chapter"
        :aria-pressed="step === i"
        @click="selectScene(i)"
      >
        <span class="meter"><span v-if="step === i" class="fill" :style="{ scale: `${progress} 1` }" /></span>

        <span class="number">{{ i + 1 }}</span>

        <b>{{ item.title }}</b>

        <span class="text"
          ><template v-for="(part, j) in highlighted(item.text)" :key="j"
            ><strong v-if="j % 2">{{ part }}</strong>

            <template v-else>{{ part }}</template></template
          ></span
        >
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
  </section>
</template>

<style scoped>
.campaign {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  gap: 30px;
  margin-top: 28px;
  padding: 36px 34px 30px;
  border: 1px solid #f4c55b40;
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse 60% 50% at 50% 55%, #f4c55b1a, transparent 70%),
    radial-gradient(ellipse at 0% 100%, #7fe0b412, transparent 45%), linear-gradient(170deg, #1c2a24, #0f1915);
  box-shadow: 0 20px 60px #0004;
}
.campaign::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: repeating-radial-gradient(circle at 50% 62%, transparent 0 46px, #ece8dc06 46px 48px);
  mask-image: radial-gradient(ellipse at 50% 60%, #000 20%, transparent 70%);
}
.pitch {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 420px);
  align-items: end;
  gap: 16px 48px;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
h2 {
  margin: 12px 0 0;
  font-size: clamp(44px, 7vw, 76px);
  line-height: 1;
}
.intro {
  margin: 0;
  color: var(--chalk-dim);
  font-size: 15px;
  line-height: 1.6;
}
.stage {
  position: relative;
}
.stage > .device {
  position: absolute;
  transform-origin: 0 0;
}
.chapters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  align-items: stretch;
  gap: 12px;
}
.chapter {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-content: start;
  gap: 6px 10px;
  padding: 18px 16px 16px;
  overflow: hidden;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #ffffff04;
  color: var(--chalk-dim);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s,
    color 0.2s;
}
.chapter:hover {
  border-color: var(--edge-strong);
}
.chapter[aria-pressed='true'] {
  border-color: #f4c55b60;
  background: #f4c55b0d;
  color: var(--chalk);
}
.meter {
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--edge);
}
.fill {
  display: block;
  height: 100%;
  background: var(--gold);
  transform-origin: 0 50%;
  transition: scale 0.1s linear;
}
.number {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 800;
}
.chapter[aria-pressed='true'] .number {
  border-color: var(--gold);
  color: var(--gold);
}
.chapter b {
  align-self: center;
  font-size: 15px;
}
.text {
  grid-column: 2;
  font-size: 13px;
  line-height: 1.55;
  color: var(--chalk-dim);
}
.text strong {
  color: var(--gold);
  font-weight: 700;
}
.pause {
  align-self: center;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: #0f1915cc;
  color: var(--chalk-dim);
  cursor: pointer;
}
.pause:hover {
  color: var(--gold);
}
@media (max-width: 900px) {
  .pitch {
    grid-template-columns: minmax(0, 1fr);
  }
  .chapters {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  .chapter {
    padding: 14px 14px 12px;
  }
  .pause {
    justify-self: end;
  }
}
@media (max-width: 760px) {
  .campaign {
    gap: 24px;
    padding: 28px 18px 20px;
  }
}
</style>
