<script setup lang="ts">
import { TooltipArrow, TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'

withDefaults(defineProps<{ side?: 'top' | 'right' | 'bottom' | 'left'; disabled?: boolean }>(), {
  side: 'top',
  disabled: false,
})
</script>

<template>
  <TooltipRoot :disabled="disabled">
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>

    <TooltipPortal>
      <TooltipContent class="tooltip" :side="side" :side-offset="8" :collision-padding="12">
        <slot name="content" />
        <TooltipArrow class="tooltip-arrow" :width="10" :height="5" />
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>
