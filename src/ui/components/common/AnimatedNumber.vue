<script setup lang="ts">
import { TransitionPresets, useTimeoutFn, useTransition } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{ value: number; duration?: number; from?: number; delay?: number }>(),
  {
    duration: 450,
    from: undefined,
    delay: 0,
  },
)

/** With `from`, the number counts up after `delay` when the component appears. */
const source = ref(props.from ?? props.value)
useTimeoutFn(() => (source.value = props.value), props.delay, { immediate: props.from !== undefined })

watch(
  () => props.value,
  (value) => (source.value = value),
)

const animated = useTransition(source, {
  duration: props.duration,
  transition: TransitionPresets.easeOutCubic,
})

const shown = computed(() => Math.round(animated.value))
</script>

<template>
  <span class="number">{{ shown }}</span>
</template>

<style scoped>
.number {
  font-variant-numeric: tabular-nums;
}
</style>
