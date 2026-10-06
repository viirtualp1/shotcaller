<script setup lang="ts">
import { ArrowRight, FlaskConical, Gauge, Languages, Smartphone, Volume2 } from '@lucide/vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import { DIFFICULTIES, type Difficulty } from '@/content/rules'
import { useGameText } from '../../composables/useGameText'
import { canVibrate, vibrate } from '../../haptics'
import { useMenuStore } from '../../stores/menu'
import { usePatchNotesStore } from '../../stores/patchNotes'
import { useSettingsStore } from '../../stores/settings'
import { useAudioStore } from '../../stores/audio'
import CheckField from '../common/CheckField.vue'
import ExperimentInfo from './ExperimentInfo.vue'
import LanguageSwitch from './LanguageSwitch.vue'

const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[]

const LANE_ORDERS_PATCH = '8.5'

/** Experiments with a short note; lane orders also link to their illustrated guide from theirs. */
const EXPERIMENTS = [
  {
    key: 'heroRotation',
    name: 'settings.heroRotation',
    hint: 'settings.heroRotationHint',
  },
  {
    key: 'roundTwists',
    name: 'settings.roundTwists',
    hint: 'settings.roundTwistsHint',
  },
] as const

withDefaults(
  defineProps<{
    language?: boolean
    sound?: boolean
    device?: boolean
    showDifficulty?: boolean
    showExperiments?: boolean
  }>(),
  {
    language: true,
    sound: true,
    device: true,
    showDifficulty: true,
    showExperiments: true,
  },
)

const settings = useSettingsStore()
const audio = useAudioStore()
const menu = useMenuStore()
const notes = usePatchNotesStore()
const { t } = useGameText()
/** Desktops have no vibration; the switch would do nothing there. */
const vibrates = canVibrate()

const difficulty = computed({
  get: () => settings.difficulty,
  set: (value: string | undefined) => {
    if (value && value in DIFFICULTIES) {
      settings.difficulty = value as Difficulty
    }
  },
})

const musicVolumePercent = computed({
  get: () => Math.round(audio.musicVolume * 100),
  set: (value: number) => (audio.musicVolume = value / 100),
})

const effectsVolumePercent = computed({
  get: () => Math.round(audio.effectsVolume * 100),
  set: (value: number) => (audio.effectsVolume = value / 100),
})

/** Turning vibration on buzzes at once, inside the tap, so the coach feels what it does. */
const vibration = computed({
  get: () => settings.vibration,
  set: (on: boolean) => {
    settings.vibration = on

    if (on) {
      vibrate('tap')
    }
  },
})

function setVolume(target: 'music' | 'effects', event: Event) {
  const volume = Number((event.target as HTMLInputElement).value)
  if (target === 'music') {
    musicVolumePercent.value = volume
  } else {
    effectsVolumePercent.value = volume
  }
}

function difficultyHint(id: Difficulty) {
  const seconds = DIFFICULTIES[id].planningSeconds
  return seconds === null
    ? t('settings.difficultyHint.relaxed')
    : t('settings.difficultyHint.standard', { s: seconds })
}

function openOrdersPatch() {
  menu.gameMenu = false
  menu.newMatch = false
  menu.settings = false
  notes.open(LANE_ORDERS_PATCH)
}
</script>

<template>
  <div class="fields">
    <section v-if="showDifficulty" class="field">
      <h3 class="label"><Gauge :size="16" /> {{ t('settings.difficulty') }}</h3>

      <ToggleGroupRoot
        v-model="difficulty"
        type="single"
        class="segmented-control"
        :aria-label="t('settings.difficulty')"
      >
        <div v-for="id in DIFFICULTY_IDS" :key="id" class="difficulty-option">
          <ToggleGroupItem
            :value="id"
            class="segmented-option"
            :aria-label="t(`settings.difficulties.${id}`)"
          />

          <span class="difficulty-face">
            <span aria-hidden="true">{{ t(`settings.difficulties.${id}`) }}</span>
            <ExperimentInfo :title="t(`settings.difficulties.${id}`)" :text="difficultyHint(id)" hover />
          </span>
        </div>
      </ToggleGroupRoot>
    </section>

    <section v-if="language" class="field">
      <h3 class="label"><Languages :size="16" /> {{ t('settings.language') }}</h3>

      <LanguageSwitch />
    </section>

    <section v-if="sound" class="field audio-levels">
      <h3 class="label"><Volume2 :size="16" /> {{ t('settings.audio') }}</h3>

      <label class="volume">
        <span
          >{{ t('settings.musicVolume') }} <output>{{ musicVolumePercent }}%</output></span
        >

        <input
          type="range"
          min="0"
          max="30"
          step="1"
          :value="musicVolumePercent"
          :aria-label="t('settings.musicVolume')"
          @input="setVolume('music', $event)"
        />
      </label>

      <label class="volume">
        <span
          >{{ t('settings.effectsVolume') }} <output>{{ effectsVolumePercent }}%</output></span
        >

        <input
          type="range"
          min="0"
          max="30"
          step="1"
          :value="effectsVolumePercent"
          :aria-label="t('settings.effectsVolume')"
          @input="setVolume('effects', $event)"
        />
      </label>
    </section>

    <section v-if="device" class="field">
      <h3 class="label"><Smartphone :size="16" /> {{ t('settings.device') }}</h3>

      <CheckField v-if="vibrates" v-model="vibration">{{ t('settings.vibration') }}</CheckField>

      <div class="experiment">
        <CheckField v-model="settings.batterySaver">{{ t('settings.batterySaver') }}</CheckField>

        <ExperimentInfo :title="t('settings.batterySaver')" :text="t('settings.batterySaverHint')" />
      </div>
    </section>

    <div v-if="showExperiments || $slots.beforeExperiments" class="after">
      <slot name="beforeExperiments" />

      <hr v-if="showExperiments && $slots.beforeExperiments" class="divider" />

      <section v-if="showExperiments" class="field experiments">
        <h3 class="label"><FlaskConical :size="16" /> {{ t('settings.experiments') }}</h3>

        <div class="experiment">
          <CheckField v-model="settings.laneOrders">{{ t('settings.laneOrders') }}</CheckField>

          <ExperimentInfo :title="t('settings.laneOrders')" :text="t('settings.laneOrdersHint')">
            <a class="guide" :href="`/patches/${LANE_ORDERS_PATCH}/`" @click.prevent="openOrdersPatch">
              {{ t('settings.laneOrdersAbout') }} <ArrowRight :size="14" />
            </a>
          </ExperimentInfo>
        </div>

        <div v-for="experiment in EXPERIMENTS" :key="experiment.key" class="experiment">
          <CheckField v-model="settings[experiment.key]">{{ t(experiment.name) }}</CheckField>

          <ExperimentInfo :title="t(experiment.name)" :text="t(experiment.hint)" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.fields {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

/* As tall as the language switch: the face is laid over an empty button, so it sets no height of its own. */
.difficulty-option {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 34px;
  border-radius: var(--radius);
  color: var(--chalk-dim);
}

.difficulty-option:has([data-state='on']) {
  background: var(--gold);
  color: var(--ink);
}

.difficulty-option .segmented-option {
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
  background: transparent;
  color: inherit;
}

.difficulty-option .segmented-option[data-state='on'] {
  background: transparent;
  color: inherit;
}

.difficulty-face {
  grid-area: 1 / 1;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 100%;
  padding-inline: 8px;
  font-weight: 600;
  pointer-events: none;
}

.difficulty-face > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.difficulty-option :deep(.about) {
  position: static;
  pointer-events: auto;
}

.difficulty-option:has([data-state='on']) :deep(.about) {
  color: var(--ink);
}

.volume {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--chalk-dim);
  font-size: 12px;
  font-weight: 600;
}

.volume span {
  display: flex;
  justify-content: space-between;
}

.volume output {
  color: var(--chalk-faint);
  font-variant-numeric: tabular-nums;
}

.volume input {
  width: 100%;
  accent-color: var(--gold);
  cursor: pointer;
}

.after {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.divider {
  width: 100%;
  margin: 0;
  border: 0;
  border-top: 1px solid var(--edge);
}

.experiments {
  gap: 14px;
}

.guide {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  color: var(--gold);
  font-weight: 700;
}

.experiment {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 380px) {
  .difficulty-face {
    font-size: 13px;
  }
}
</style>
