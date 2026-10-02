<script setup lang="ts">
import { Map } from '@lucide/vue'
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import { MODE_IDS, type ModeId } from '@/content/ids'
import { useGameText } from '../../composables/useGameText'
import ModeMap from './ModeMap.vue'

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
const mode = defineModel<ModeId>({ required: true })

const { t } = useGameText()

const picked = computed({
  get: () => mode.value,
  set: (value: string) => {
    const id = MODE_IDS.find((m) => m === value)
    if (id) {
      mode.value = id
    }
  },
})
</script>

<template>
  <section class="field">
    <h3 class="label"><Map :size="16" /> {{ t('modes.title') }}</h3>

    <RadioGroupRoot v-model="picked" class="modes" :disabled="disabled" :aria-label="t('modes.title')">
      <RadioGroupItem v-for="id in MODE_IDS" :key="id" :value="id" class="mode">
        <ModeMap :mode="id" :size="56" />

        <span class="about">
          <strong>{{ t(`modes.${id}.name`) }}</strong>
          <span class="text">{{ t(`modes.${id}.text`) }}</span>
        </span>
      </RadioGroupItem>
    </RadioGroupRoot>
  </section>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.modes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mode {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 8px 8px;
  border: 1.5px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.2);
  color: var(--chalk);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.mode:hover:not([data-disabled]) {
  border-color: var(--edge-strong);
}

.mode[data-state='checked'] {
  border-color: var(--gold);
  background: rgba(244, 197, 91, 0.08);
}

.mode[data-disabled] {
  cursor: default;
  opacity: 0.55;
}

.mode[data-disabled][data-state='checked'] {
  opacity: 1;
}

.about {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.text {
  font-size: 12.5px;
  color: var(--chalk-dim);
}
</style>
