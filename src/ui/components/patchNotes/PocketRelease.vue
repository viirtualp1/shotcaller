<script setup lang="ts">
import { BatteryCharging, ChevronUp, Focus, Smartphone, Sun, Swords, Vibrate, ZoomIn } from '@lucide/vue'
import { computed, ref } from 'vue'
import type { HeroId, StarLevel } from '@/content/ids'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ModeMap from '../modes/ModeMap.vue'

type View = 'all' | 'top' | 'bot'

interface Unit {
  readonly hero: HeroId
  readonly team: 0 | 1
  readonly x: number
  readonly y: number
  readonly stars?: StarLevel
}

// A fixed 9.4 example battle on two lanes, independent of the current match, account and balance.
const UNITS: readonly Unit[] = [
  {
    hero: 'giant',
    team: 0,
    x: 41,
    y: 17,
    stars: 2,
  },
  {
    hero: 'archer',
    team: 0,
    x: 32,
    y: 20,
  },
  {
    hero: 'butcher',
    team: 1,
    x: 59,
    y: 17,
  },
  {
    hero: 'pyromancer',
    team: 1,
    x: 68,
    y: 20,
  },
  {
    hero: 'changeling',
    team: 0,
    x: 41,
    y: 83,
    stars: 2,
  },
  {
    hero: 'acolyte',
    team: 0,
    x: 32,
    y: 80,
  },
  {
    hero: 'sniper',
    team: 1,
    x: 59,
    y: 83,
  },
  {
    hero: 'warden',
    team: 1,
    x: 68,
    y: 80,
  },
]

/** Where each view centres the map and how close it comes, as the follow camera does in a battle. */
const FOCUS: Readonly<Record<View, { y: number; zoom: number }>> = {
  all: {
    y: 0,
    zoom: 1,
  },
  top: {
    y: 33.5,
    zoom: 2.1,
  },
  bot: {
    y: -33.5,
    zoom: 2.1,
  },
}

const VIEWS: readonly View[] = ['all', 'top', 'bot']

const settings = useSettingsStore()

const view = ref<View>('all')

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: '9.4 / Игра на телефоне',
        title: 'Весь бой —\nв одной руке.',
        intro:
          'Приближай любую стычку двумя пальцами, отдай камеру нужной линии и убери панель боя, пока она не понадобится. Карта занимает весь экран, а телефон отзывается на каждый ход.',
        sample: 'Пример боя',
        round: 'Раунд 7 · 0:38',
        panel: 'Панель боя',
        views: {
          all: 'Вся карта',
          top: 'Верх',
          bot: 'Низ',
        },
        picker: 'Камера в примере',
        caption: 'Выбери линию — камера сделает остальное.',
        captions: {
          all: 'Вся карта на одном экране. Выбери линию, чтобы камера следила за её боем.',
          top: 'Камера следит за верхней линией и подходит ближе, когда герои сходятся.',
          bot: 'Changeling и Acolyte держат нижнюю линию, а камера не выпускает их из кадра до конца боя.',
        },
        notes: [
          {
            icon: ZoomIn,
            title: 'Щипок',
            text: 'Приближение до 3×',
          },
          {
            icon: Vibrate,
            title: 'Отклик',
            text: 'Вибрация на каждый ход',
          },
          {
            icon: Sun,
            title: 'Без затемнения',
            text: 'Экран не гаснет в бою',
          },
          {
            icon: BatteryCharging,
            title: 'Экономия',
            text: 'Телефон остаётся прохладным',
          },
        ],
      }
    : {
        eyebrow: '9.4 / Phone play',
        title: 'The whole fight\nin one hand.',
        intro:
          'Pinch into any skirmish, hand the camera to the lane that matters and keep the battle panel tucked away until you need it. The map gets the whole screen, and your phone answers every move.',
        sample: 'Sample battle',
        round: 'Round 7 · 0:38',
        panel: 'Battle panel',
        views: {
          all: 'Whole map',
          top: 'Top',
          bot: 'Bot',
        },
        picker: 'Camera in this example',
        caption: 'Pick a lane. The camera does the rest.',
        captions: {
          all: 'The whole map on one screen. Pick a lane and the camera follows its fight.',
          top: 'The camera follows the top lane and closes in as the heroes meet.',
          bot: 'Changeling and Acolyte hold the bottom lane, and the camera keeps them in frame to the end.',
        },
        notes: [
          {
            icon: ZoomIn,
            title: 'Pinch',
            text: 'Zoom in up to 3×',
          },
          {
            icon: Vibrate,
            title: 'Feel it',
            text: 'A buzz on every move',
          },
          {
            icon: Sun,
            title: 'No dimming',
            text: 'The screen stays on in battle',
          },
          {
            icon: BatteryCharging,
            title: 'Battery saver',
            text: 'Your phone stays cool',
          },
        ],
      },
)

const worldStyle = computed(() => {
  const focus = FOCUS[view.value]
  return { transform: `scale(${focus.zoom}) translateY(${focus.y}%)` }
})
</script>

<template>
  <section class="pocket-release" aria-labelledby="pocket-release-title">
    <div class="pitch">
      <div>
        <p class="eyebrow"><Smartphone :size="15" /> {{ copy.eyebrow }}</p>
        <h2 id="pocket-release-title" class="hand">{{ copy.title }}</h2>
      </div>

      <p class="lead">{{ copy.intro }}</p>
    </div>

    <figure class="showcase">
      <div class="stage">
        <ul class="notes left">
          <li v-for="note in copy.notes.slice(0, 2)" :key="note.title" class="note">
            <component :is="note.icon" :size="20" />
            <strong>{{ note.title }}</strong>
            <span>{{ note.text }}</span>
          </li>
        </ul>

        <div class="device">
          <div class="phone" aria-hidden="true">
            <div class="screen">
              <div class="viewport">
                <div class="world" :style="worldStyle">
                  <ModeMap mode="twoLanes" :size="260" />

                  <span
                    v-for="unit in UNITS"
                    :key="unit.hero"
                    class="unit"
                    :style="{ left: `${unit.x}%`, top: `${unit.y}%` }"
                  >
                    <HeroAvatar :hero-id="unit.hero" :team="unit.team" :stars="unit.stars ?? 1" :size="22" />
                  </span>

                  <Swords class="clash top" :size="12" />
                  <Swords class="clash bot" :size="12" />
                </div>
              </div>

              <div class="scoreboard">
                <i class="ours" />
                <b class="hand">{{ copy.round }}</b>
                <i class="theirs" />
              </div>

              <span class="sample">{{ copy.sample }}</span>
              <span class="panel-chip"><ChevronUp :size="13" /> {{ copy.panel }}</span>
            </div>
          </div>

          <div class="views" role="radiogroup" :aria-label="copy.picker">
            <Focus :size="16" class="views-icon" aria-hidden="true" />

            <button
              v-for="id in VIEWS"
              :key="id"
              type="button"
              role="radio"
              class="view"
              :class="{ on: view === id }"
              :aria-checked="view === id"
              @click="view = id"
            >
              {{ copy.views[id] }}
            </button>
          </div>
        </div>

        <ul class="notes right">
          <li v-for="note in copy.notes.slice(2)" :key="note.title" class="note">
            <component :is="note.icon" :size="20" />
            <strong>{{ note.title }}</strong>
            <span>{{ note.text }}</span>
          </li>
        </ul>
      </div>

      <figcaption>
        <strong class="hand">{{ copy.caption }}</strong>
        <p aria-live="polite">{{ copy.captions[view] }}</p>
      </figcaption>
    </figure>
  </section>
</template>

<style scoped>
.pocket-release {
  margin-top: 34px;
  overflow: hidden;
  border: 1px solid #f4c55b40;
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 85% 0, #8dba8418, transparent 50%),
    radial-gradient(ellipse at 10% 100%, #f4c55b10, transparent 55%), #14211b;
  box-shadow: 0 24px 70px #0004;
}

.pitch {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  align-items: end;
  gap: 32px;
  padding: 40px 40px 12px;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  font-size: clamp(40px, 5.5vw, 68px);
  line-height: 0.98;
  white-space: pre-line;
  color: var(--chalk);
}

.lead {
  margin: 0;
  color: var(--chalk-dim);
  font-size: 15px;
  line-height: 1.7;
}

.showcase {
  margin: 0;
}

.stage {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 28px;
  margin: 18px 20px 0;
  padding: 28px 24px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 50% 55%, #375d3f66, transparent 65%),
    linear-gradient(#b0c4a606 1px, transparent 1px) 0 0 / 28px 28px,
    linear-gradient(90deg, #b0c4a606 1px, transparent 1px) 0 0 / 28px 28px,
    #101b16;
}

.notes {
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.note {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 12px;
  row-gap: 3px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid #cdd6ba24;
  border-radius: var(--radius);
  background: #1a2821e6;
  box-shadow: 0 14px 32px #0005;
  color: var(--gold);
}

.note svg {
  grid-row: span 2;
}

.note strong {
  color: var(--chalk);
  font-size: 14px;
}

.note span {
  color: var(--chalk-dim);
  font-size: 12px;
  line-height: 1.4;
}

.left .note:first-child,
.right .note:last-child {
  rotate: -1.5deg;
}

.left .note:last-child,
.right .note:first-child {
  rotate: 1.5deg;
}

/* A phone drawn in CSS: decorative artwork keeps its own rounded silhouette. */
.phone {
  width: 236px;
  padding: 9px;
  border: 1px solid #cdd6ba33;
  border-radius: 36px;
  background: linear-gradient(160deg, #26332d, #111915);
  box-shadow:
    0 0 0 6px #0c1310,
    0 30px 60px #0008,
    0 0 70px #f4c55b14;
}

.screen {
  position: relative;
  height: 440px;
  overflow: hidden;
  border-radius: 28px;
  background: radial-gradient(circle at 50% 50%, #2a3c33, transparent 75%), #18221f;
}

.viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

/* Wider than the screen, as a match frames the lanes: centred so both bases are cut off evenly. */
.world {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 260px;
  height: 260px;
  margin: -130px 0 0 -130px;
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.world :deep(.mode-map) {
  width: 100%;
  height: 100%;
}

/* The phone shows the lanes edge to edge, as a match does, rather than a framed board. */
.world :deep(.ground) {
  fill: transparent;
  stroke: none;
}

.unit {
  position: absolute;
  translate: -50% -50%;
  filter: drop-shadow(0 3px 4px #0009);
}

.clash {
  position: absolute;
  left: 50%;
  translate: -50% -50%;
  color: var(--gold);
}

.clash.top {
  top: 15%;
}

.clash.bot {
  top: 85%;
}

.scoreboard {
  position: absolute;
  top: 0;
  left: 50%;
  translate: -50% 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 7px;
  border: 1px solid var(--edge);
  border-top: 0;
  border-radius: 0 0 var(--radius) var(--radius);
  background: #111815f0;
  white-space: nowrap;
}

.scoreboard b {
  color: var(--theirs);
  font-size: 15px;
}

.scoreboard i {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

.scoreboard .ours {
  background: var(--ours);
}

.scoreboard .theirs {
  background: var(--theirs);
}

.sample {
  position: absolute;
  top: 52px;
  left: 50%;
  translate: -50% 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: #0009;
  color: var(--chalk-faint);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.panel-chip {
  position: absolute;
  bottom: 18px;
  left: 50%;
  translate: -50% 0;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border: 1px solid #f4c55b8c;
  border-radius: var(--radius);
  background: #111815f0;
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.device {
  display: grid;
  justify-items: center;
  gap: 18px;
}

.views {
  display: flex;
  align-items: center;
  gap: 4px;
  width: max-content;
  min-width: 100%;
  padding: 3px;
  border-radius: var(--radius);
  background: #0006;
}

.views-icon {
  flex: none;
  margin: 0 6px;
  color: var(--chalk-dim);
}

.view {
  flex: 1;
  min-height: 36px;
  padding: 0 12px;
  white-space: nowrap;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--chalk-dim);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.view.on {
  background: var(--gold);
  color: var(--ink);
}

.view:focus-visible {
  outline: 2px solid var(--chalk);
  outline-offset: 2px;
}

figcaption {
  padding: 22px 24px 28px;
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
  font-size: 13px;
  line-height: 1.5;
  color: var(--chalk-dim);
}

@media (max-width: 860px) {
  .pitch {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 28px 24px 8px;
  }

  .stage {
    grid-template-columns: 1fr;
    justify-items: center;
    margin-inline: 12px;
    padding: 24px 14px;
  }

  .device {
    grid-row: 1;
  }

  .notes {
    grid-template-columns: 1fr 1fr;
    width: 100%;
    gap: 10px;
  }

  .stage .notes .note {
    padding: 12px;
    rotate: 0deg;
  }
}

@media (max-width: 420px) {
  .notes {
    grid-template-columns: 1fr;
  }

  .phone {
    width: 216px;
  }

  .screen {
    height: 400px;
  }

  figcaption strong {
    font-size: 26px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .world {
    transition: none;
  }
}
</style>
