<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MatchState } from '@/domain/match/Match'
import type { PlanningModel } from '@/rendering/layers/PlanningLayer'
import { useBoardRenderer } from '../../composables/useBoardRenderer'

/** A saved match drawn as it was left: its mode's map, both lineups and what is left of the structures. */
const props = defineProps<{ state: MatchState }>()

const model = computed((): PlanningModel => ({
  lineups: [props.state.players[0].roster.lanes, props.state.players[1].roster.lanes],
  structures: props.state.structures,
  selectedUid: null,
  inspectedUid: null,
}))

const host = ref<HTMLElement | null>(null)
const renderer = useBoardRenderer(host, 0, props.state.mode)
watch([renderer, model], ([board, planned]) => board?.showPlanning(planned, false), { immediate: true })
</script>

<template>
  <div ref="host" class="preview" aria-hidden="true" />
</template>

<style scoped>
.preview {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
