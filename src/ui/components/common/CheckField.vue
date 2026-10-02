<script setup lang="ts">
import { Check } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'

/** A checkbox with its label; the whole line toggles it. */
const checked = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="check-field">
    <CheckboxRoot v-model="checked" class="checkbox">
      <CheckboxIndicator class="tick"><Check :size="15" :stroke-width="3" /></CheckboxIndicator>
    </CheckboxRoot>

    <span><slot /></span>
  </label>
</template>

<style scoped>
.check-field {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 600;
}

.checkbox {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: var(--radius);
  border: 1.5px solid var(--edge-strong);
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.checkbox[data-state='checked'] {
  background: var(--gold);
  border-color: var(--gold);
}

.tick {
  display: grid;
  place-items: center;
  color: var(--ink);
}
</style>
