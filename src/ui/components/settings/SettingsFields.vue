<script setup lang="ts">
import { FlaskConical, Gauge, Info, Languages } from 'lucide-vue-next'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import { DIFFICULTIES, type Difficulty } from '@/content/rules'
import { useGameText } from '../../composables/useGameText'
import { useMenuStore } from '../../stores/menu'
import { usePatchNotesStore } from '../../stores/patchNotes'
import { useSettingsStore } from '../../stores/settings'
import CheckField from '../common/CheckField.vue'
import LanguageSwitch from './LanguageSwitch.vue'

const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[]

const LANE_ORDERS_PATCH = '8.5'

withDefaults(defineProps<{ language?: boolean }>(), { language: true })

const settings = useSettingsStore()
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

function openOrdersPatch() {
  menu.gameMenu = false
  menu.newMatch = false
  menu.settings = false
  notes.open(LANE_ORDERS_PATCH)
}
</script>

<template>
  <div class="fields">
    <section class="field">
      <h3 class="label"><Gauge :size="16" /> {{ t('settings.difficulty') }}</h3>

      <ToggleGroupRoot
        v-model="difficulty"
        type="single"
        class="choices"
        :aria-label="t('settings.difficulty')"
      >
        <ToggleGroupItem v-for="id in DIFFICULTY_IDS" :key="id" :value="id" class="choice">
          {{ t(`settings.difficulties.${id}`) }}
        </ToggleGroupItem>
      </ToggleGroupRoot>

      <p class="hint">{{ difficultyHint }}</p>
    </section>

    <section v-if="language" class="field">
      <h3 class="label"><Languages :size="16" /> {{ t('settings.language') }}</h3>

      <LanguageSwitch />
    </section>

    <div class="after">
      <slot name="beforeExperiments" />

      <hr v-if="$slots.beforeExperiments" class="divider" />

      <section class="field experiments">
        <h3 class="label"><FlaskConical :size="16" /> {{ t('settings.experiments') }}</h3>

        <div class="lane-orders">
          <CheckField v-model="settings.laneOrders">{{ t('settings.laneOrders') }}</CheckField>

          <a
            class="about"
            :href="`#/patches/${LANE_ORDERS_PATCH}`"
            :aria-label="t('settings.laneOrdersAbout')"
            @click.prevent="openOrdersPatch"
          >
            <Info :size="15" />
          </a>
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

.choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
}

.choice {
  padding: 9px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--chalk-dim);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.choice[data-state='on'] {
  background: var(--gold);
  color: var(--ink);
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--chalk-faint);
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

.lane-orders {
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
  border-radius: 50%;
  color: var(--chalk-dim);
}

.about:hover {
  color: var(--gold);
}
</style>
