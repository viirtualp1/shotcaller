<script setup lang="ts">
import { ArrowUpRight, Flag, Layers3, Shield, Sparkles, Swords, Target, Trophy } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useProfileStore } from '../../stores/profile'
import { useSettingsStore } from '../../stores/settings'
import ModeMap from '../modes/ModeMap.vue'

const settings = useSettingsStore()
const profile = useProfileStore()
const selected = ref(0)

// Release illustrations are historical examples, not the player's current progress.
const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        eyebrow: 'Карьера · Испытания · Награды',
        title: 'Каждый матч —\nшаг вперёд.',
        intro:
          'Новые цели для твоего отряда. Новые причины вернуться. Прокачивай профиль, открывай испытания и превращай опыт в следующий вызов.',
        contracts: 'контракта в неделю',
        trials: 'испытания',
        milestones: 'целей карьеры',
        open: 'Открыть карьеру',
        path: 'Твой путь испытаний',
        pick: 'Выбери уровень — узнай свой следующий вызов',
        level: 'Уровень',
        unlock: 'Открывается на уровне',
        reward: 'за первое прохождение',
        modes: ['Две линии', 'Одна линия', 'Три линии'],
        entries: [
          {
            name: 'Штурм трона',
            goal: 'Победи, разрушив вражеский трон. Победа по лимиту раундов не считается.',
          },
          {
            name: 'Сила связок',
            goal: 'Победи с тремя разными активными синергиями в финальном составе.',
          },
          {
            name: 'Полный арсенал',
            goal: 'Победи с тремя героями на поле, у каждого из которых по два предмета.',
          },
          {
            name: 'Три фронта',
            goal: 'Победи, заняв все три линии и собрав три активные синергии в финальном составе.',
          },
        ],
      }
    : {
        eyebrow: 'Career · Trials · Rewards',
        title: 'Every match.\nA step forward.',
        intro:
          'New goals for your squad. New reasons to return. Level up your profile, unlock trials and turn experience into your next challenge.',
        contracts: 'weekly contracts',
        trials: 'solo trials',
        milestones: 'career milestones',
        open: 'Explore your career',
        path: 'Your trial path',
        pick: 'Pick a level to discover your next challenge',
        level: 'Level',
        unlock: 'Unlocks at level',
        reward: 'for your first clear',
        modes: ['Two lanes', 'One lane', 'Three lanes'],
        entries: [
          {
            name: 'Throne assault',
            goal: 'Win by destroying the enemy throne. A round-limit victory does not count.',
          },
          {
            name: 'Better together',
            goal: 'Win with three different active synergies in your final lineup.',
          },
          {
            name: 'Full arsenal',
            goal: 'Win with three fielded heroes carrying two items each.',
          },
          {
            name: 'Three fronts',
            goal: 'Win with all three lanes occupied and three active synergies in your final lineup.',
          },
        ],
      },
)

const trials = [
  {
    level: 2,
    xp: 150,
    icon: Shield,
    mode: 'twoLanes',
    modeIndex: 0,
  },
  {
    level: 4,
    xp: 200,
    icon: Sparkles,
    mode: 'twoLanes',
    modeIndex: 0,
  },
  {
    level: 6,
    xp: 250,
    icon: Swords,
    mode: 'oneLane',
    modeIndex: 1,
  },
  {
    level: 8,
    xp: 300,
    icon: Flag,
    mode: 'threeLanes',
    modeIndex: 2,
  },
] as const

const trial = computed(() => trials[selected.value]!)
const entry = computed(() => copy.value.entries[selected.value]!)
</script>

<template>
  <section class="campaign" aria-labelledby="career-release-title">
    <div class="pitch">
      <p class="eyebrow"><Sparkles :size="14" /> {{ copy.eyebrow }}</p>
      <h2 id="career-release-title" class="hand">{{ copy.title }}</h2>
      <p class="intro">{{ copy.intro }}</p>

      <dl class="counts">
        <div>
          <dt><Target :size="16" /> 3</dt>
          <dd>{{ copy.contracts }}</dd>
        </div>

        <div>
          <dt><Layers3 :size="16" /> 4</dt>
          <dd>{{ copy.trials }}</dd>
        </div>

        <div>
          <dt><Trophy :size="16" /> 5</dt>
          <dd>{{ copy.milestones }}</dd>
        </div>
      </dl>

      <a href="/career/" class="career-link" @click.prevent="profile.openCareer()">
        {{ copy.open }} <ArrowUpRight :size="18" />
      </a>
    </div>

    <div class="journey">
      <div class="journey-heading">
        <span class="eyebrow">{{ copy.path }}</span>
        <p>{{ copy.pick }}</p>
      </div>

      <div class="path" role="group" :aria-label="copy.path">
        <button
          v-for="(step, i) in trials"
          :key="step.level"
          type="button"
          :class="{ selected: i === selected }"
          :aria-pressed="i === selected"
          :aria-label="`${copy.level} ${step.level}: ${copy.entries[i]!.name}`"
          aria-controls="trial-preview"
          @click="selected = i"
        >
          <span class="level">{{ step.level }}</span>
          <component :is="step.icon" :size="17" />
        </button>
      </div>

      <div id="trial-preview" class="dossier" aria-live="polite" aria-atomic="true">
        <div class="trial-top">
          <span class="unlock"
            >{{ copy.unlock }} <b>{{ trial.level }}</b></span
          >

          <span class="mode">{{ copy.modes[trial.modeIndex] }}</span>
        </div>

        <div class="trial-title">
          <span class="trial-emblem"><component :is="trial.icon" :size="28" /></span>
          <h3>{{ entry.name }}</h3>
          <ModeMap :key="trial.mode" :mode="trial.mode" :size="68" class="map" aria-hidden="true" />
        </div>

        <p class="goal">{{ entry.goal }}</p>

        <div class="reward">
          <b>+{{ trial.xp }} XP</b><span>{{ copy.reward }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.campaign {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-top: 28px;
  padding: 36px;
  border: 1px solid color-mix(in srgb, var(--gold) 35%, var(--edge));
  border-radius: var(--radius);
  background:
    radial-gradient(ellipse at 100% 0%, #f4c55b16, transparent 65%),
    linear-gradient(140deg, #26342b, #101a17 85%);
  box-shadow: 0 20px 60px #0004;
}
.campaign::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background-image:
    linear-gradient(#f4c55b06 1px, transparent 1px), linear-gradient(90deg, #f4c55b06 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(90deg, transparent, #000);
}
.pitch {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
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
  font-size: clamp(36px, 5vw, 52px);
  line-height: 1.02;
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
.career-link {
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
.career-link:hover {
  background: #ffda86;
}
.career-link:focus-visible,
.path button:focus-visible {
  outline: 2px solid var(--chalk);
  outline-offset: 4px;
}
.journey {
  align-self: center;
  min-width: 0;
}
.journey-heading p {
  margin: 7px 0 0;
  font-size: 11px;
  color: var(--chalk-dim);
  line-height: 1.5;
}
.path {
  position: relative;
  display: flex;
  justify-content: space-between;
  margin: 20px 0;
}
.path::before {
  content: '';
  position: absolute;
  top: 25px;
  left: 26px;
  right: 26px;
  height: 1px;
  background: #f4c55b40;
}
.path button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--chalk-faint);
  cursor: pointer;
}
.level {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border: 1px solid #f4c55b40;
  border-radius: 50%;
  background: #18231d;
  font-size: 22px;
  font-weight: 800;
  transition:
    background 0.2s,
    color 0.2s,
    box-shadow 0.2s;
}
.path button:hover,
.path button.selected {
  color: var(--gold);
}
.path button.selected .level {
  background: var(--gold);
  color: #15201a;
  border-color: var(--gold);
  box-shadow:
    0 0 0 5px #f4c55b10,
    0 0 32px #f4c55b20;
}
.dossier {
  padding: 18px;
  border: 1px solid #f4c55b30;
  border-radius: var(--radius);
  background: #0b1510b3;
}
.trial-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10px;
  color: var(--chalk-dim);
}
.unlock b {
  color: var(--gold);
}
.mode {
  padding: 3px 7px;
  border-radius: var(--radius);
  background: #ffffff08;
}
.trial-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}
.trial-emblem {
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
  border: 1px solid #f4c55b40;
  border-radius: var(--radius);
  background: #f4c55b0c;
  color: var(--gold);
}
h3 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
}
.map {
  flex: none;
  margin-left: auto;
  opacity: 0.65;
}
.goal {
  min-height: 4.65em;
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--chalk-dim);
}
.reward {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--edge);
}
.reward b {
  color: var(--gold);
  font-size: 18px;
}
.reward span {
  font-size: 11px;
  color: var(--chalk-faint);
}
@media (max-width: 760px) {
  .campaign {
    grid-template-columns: 1fr;
    padding: 26px;
    gap: 32px;
  }
  .counts {
    gap: 30px;
  }
  .journey {
    width: 100%;
  }
  .goal {
    min-height: 0;
  }
}
@media (max-width: 380px) {
  .campaign {
    padding: 20px;
  }
  .counts {
    gap: 15px;
  }
  .map {
    display: none;
  }
}
</style>
