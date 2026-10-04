<script setup lang="ts">
import { TooltipArrow, TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    side?: 'top' | 'right' | 'bottom' | 'left'
    disabled?: boolean
    passThrough?: boolean
    clickable?: boolean
  }>(),
  {
    side: 'top',
    disabled: false,
    passThrough: false,
    clickable: false,
  },
)

const open = ref(false)

function toggle() {
  if (props.clickable) {
    open.value = !open.value
  }
}
</script>

<template>
  <TooltipRoot
    v-model:open="open"
    :disabled="disabled"
    :disable-closing-trigger="clickable"
    :disable-hoverable-content="passThrough ? true : undefined"
  >
    <TooltipTrigger as-child @click="toggle">
      <slot />
    </TooltipTrigger>

    <TooltipPortal>
      <TooltipContent
        class="tooltip"
        :class="{ 'tooltip-pass-through': passThrough }"
        :side="side"
        :side-offset="8"
        :collision-padding="12"
      >
        <slot name="content" />
        <TooltipArrow class="tooltip-arrow" :width="10" :height="5" />
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>

<style scoped>
/* The positioning wrapper also covers nearby triggers, even when its content ignores pointers. */
:global([data-reka-popper-content-wrapper]:has(> .tooltip-pass-through)),
:global(.tooltip-pass-through) {
  pointer-events: none;
}
</style>
