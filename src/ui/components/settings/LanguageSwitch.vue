<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import { LOCALE_LABELS, LOCALES, isLocale } from '../../i18n'
import { useGameText } from '../../composables/useGameText'
import { useSettingsStore } from '../../stores/settings'

/** `compact` shows short codes for tight corners; otherwise full language names. */
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const settings = useSettingsStore()
const { t } = useGameText()

const language = computed({
  get: () => settings.locale,
  set: (value: string | undefined) => {
    if (isLocale(value)) {
      settings.locale = value
    }
  },
})
</script>

<template>
  <ToggleGroupRoot
    v-model="language"
    type="single"
    class="choices"
    :class="{ compact }"
    :aria-label="t('settings.language')"
  >
    <ToggleGroupItem
      v-for="locale in LOCALES"
      :key="locale"
      :value="locale"
      class="choice"
      :lang="locale"
      :aria-label="LOCALE_LABELS[locale]"
      :title="compact ? LOCALE_LABELS[locale] : undefined"
    >
      {{ compact ? locale.toUpperCase() : LOCALE_LABELS[locale] }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>

<style scoped>
.choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
}

.choices.compact {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid var(--edge-strong);
  background: rgba(17, 24, 21, 0.9);
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

.compact .choice {
  min-width: 38px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.choice:hover:not([data-state='on']) {
  color: var(--chalk);
}

.choice[data-state='on'] {
  background: var(--gold);
  color: var(--ink);
}
</style>
