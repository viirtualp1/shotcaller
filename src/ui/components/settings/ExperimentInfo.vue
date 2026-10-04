<script setup lang="ts">
import { Info } from '@lucide/vue'
import { PopoverArrow, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

/**
 * A short note on an experiment, opened by a click or a tap: phones have no hover to show a tooltip with. The
 * default slot adds anything after the note, such as a link to a guide.
 */
defineProps<{ title: string; text: string }>()
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <button type="button" class="about" :aria-label="title">
        <Info :size="15" />
      </button>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent class="tooltip experiment-info" side="top" :side-offset="8" :collision-padding="12">
        <strong>{{ title }}</strong>
        <p class="text">{{ text }}</p>
        <slot />
        <PopoverArrow class="tooltip-arrow" :width="10" :height="5" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
.about {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: none;
  color: var(--chalk-dim);
  cursor: pointer;
}

.about:hover,
.about:focus-visible,
.about[data-state='open'] {
  color: var(--gold);
}

.experiment-info {
  max-width: min(300px, calc(100vw - 32px));
}

.text {
  margin: 4px 0 0;
  color: var(--chalk-dim);
}
</style>
