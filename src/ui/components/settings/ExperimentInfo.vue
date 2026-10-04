<script setup lang="ts">
import { Info } from '@lucide/vue'
import { useMediaQuery, useTimeoutFn } from '@vueuse/core'
import { PopoverArrow, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { ref } from 'vue'

/**
 * A short note on an experiment, opened by a click or a tap: phones have no hover to show a tooltip with. The
 * default slot adds anything after the note, such as a link to a guide.
 */
const props = defineProps<{ title: string; text: string; hover?: boolean }>()

const canHover = useMediaQuery('(min-width: 861px) and (hover: hover) and (pointer: fine)')
const open = ref(false)

const { start: closeSoon, stop: keepOpen } = useTimeoutFn(
  () => {
    open.value = false
  },
  120,
  { immediate: false },
)

function show() {
  if (props.hover && canHover.value) {
    keepOpen()
    open.value = true
  }
}

function hide() {
  if (props.hover && canHover.value) {
    closeSoon()
  }
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="about"
        :aria-label="title"
        @click.stop
        @pointerdown.stop
        @mouseenter="show"
        @mouseleave="hide"
      >
        <Info :size="15" />
      </button>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        class="tooltip experiment-info"
        side="top"
        :side-offset="8"
        :collision-padding="12"
        @open-auto-focus.prevent
        @close-auto-focus.prevent
        @mouseenter="show"
        @mouseleave="hide"
      >
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

:global(.experiment-info) {
  max-width: min(300px, calc(100vw - 32px));
}

.text {
  margin: 4px 0 0;
  color: var(--chalk-dim);
}
</style>
