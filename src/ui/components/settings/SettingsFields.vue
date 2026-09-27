<script setup lang="ts">
import { Gauge, Languages } from 'lucide-vue-next'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import { DIFFICULTIES, type Difficulty } from '@/content/rules'
import { useGameText } from '../../composables/useGameText'
import { useSettingsStore } from '../../stores/settings'
import LanguageSwitch from './LanguageSwitch.vue'

const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[]

const settings = useSettingsStore()
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

    <section class="field">
      <h3 class="label"><Languages :size="16" /> {{ t('settings.language') }}</h3>

      <LanguageSwitch />
    </section>
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
</style>
