<script setup lang="ts">
import { FlaskConical, Gauge, Info, Languages, Volume2 } from '@lucide/vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import { DIFFICULTIES, type Difficulty } from '@/content/rules'
import { useGameText } from '../../composables/useGameText'
import { useMenuStore } from '../../stores/menu'
import { usePatchNotesStore } from '../../stores/patchNotes'
import { useSettingsStore } from '../../stores/settings'
import { useAudioStore } from '../../stores/audio'
import CheckField from '../common/CheckField.vue'
import InfoTooltip from '../common/InfoTooltip.vue'
import LanguageSwitch from './LanguageSwitch.vue'

const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[]

const LANE_ORDERS_PATCH = '8.5'

/** Experiments explained in a tooltip; lane orders link to their own illustrated guide instead. */
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

withDefaults(defineProps<{ language?: boolean; sound?: boolean; showDifficulty?: boolean }>(), {
  language: true,
  sound: true,
  showDifficulty: true,
})

const settings = useSettingsStore()
const audio = useAudioStore()
const menu = useMenuStore()
const notes = usePatchNotesStore()
const { t } = useGameText()

const difficulty = computed({
  get: () => settings.difficulty,
  set: (value: string | undefined) => {
    if (value && value in DIFFICULTIES) {
      settings.difficulty = value as Difficulty
    }
  },
})

const difficultyHint = computed(() => {
  const seconds = DIFFICULTIES[settings.difficulty].planningSeconds
  return seconds === null
    ? t('settings.difficultyHint.relaxed')
    : t('settings.difficultyHint.standard', { s: seconds })
})

const musicVolumePercent = computed({
  get: () => Math.round(audio.musicVolume * 100),
  set: (value: number) => (audio.musicVolume = value / 100),
})

const effectsVolumePercent = computed({
  get: () => Math.round(audio.effectsVolume * 100),
  set: (value: number) => (audio.effectsVolume = value / 100),
})

function setVolume(target: 'music' | 'effects', event: Event) {
  const volume = Number((event.target as HTMLInputElement).value)
  if (target === 'music') {
    musicVolumePercent.value = volume
  } else {
    effectsVolumePercent.value = volume
  }
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
        <ToggleGroupItem v-for="id in DIFFICULTY_IDS" :key="id" :value="id" class="segmented-option">
          {{ t(`settings.difficulties.${id}`) }}
        </ToggleGroupItem>
      </ToggleGroupRoot>

      <p class="hint">{{ difficultyHint }}</p>
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

    <div class="after">
      <slot name="beforeExperiments" />

      <hr v-if="$slots.beforeExperiments" class="divider" />

      <section class="field experiments">
        <h3 class="label"><FlaskConical :size="16" /> {{ t('settings.experiments') }}</h3>

        <div class="experiment">
          <CheckField v-model="settings.laneOrders">{{ t('settings.laneOrders') }}</CheckField>

          <a
            class="about"
            :href="`/patches/${LANE_ORDERS_PATCH}/`"
            :aria-label="t('settings.laneOrdersAbout')"
            @click.prevent="openOrdersPatch"
          >
            <Info :size="15" />
          </a>
        </div>

        <div v-for="experiment in EXPERIMENTS" :key="experiment.key" class="experiment">
          <CheckField v-model="settings[experiment.key]">{{ t(experiment.name) }}</CheckField>

          <InfoTooltip side="top">
            <button type="button" class="about" :aria-label="t(experiment.hint)">
              <Info :size="15" />
            </button>

            <template #content>
              <strong>{{ t(experiment.name) }}</strong>
              <p class="about-text">{{ t(experiment.hint) }}</p>
            </template>
          </InfoTooltip>
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

.experiment {
  display: flex;
  align-items: center;
  gap: 6px;
}

.about {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: var(--radius);
  color: var(--chalk-dim);
}

.about:hover,
.about:focus-visible {
  color: var(--gold);
}

button.about {
  padding: 0;
  border: 0;
  background: none;
  cursor: help;
}

.about-text {
  max-width: 30ch;
  margin: 4px 0 0;
  color: var(--chalk-dim);
}
</style>
