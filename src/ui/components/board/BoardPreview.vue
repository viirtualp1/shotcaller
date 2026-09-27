<script setup lang="ts">
import { ref, watch } from 'vue'
import { freshStructures } from '@/domain/match/structures'
import type { PlanningModel } from '@/rendering/layers/PlanningLayer'
import { useBoardRenderer } from '../../composables/useBoardRenderer'

const DEMO: PlanningModel = {
  lineups: [
    {
      top: [
        {
          uid: 'demo-1',
          heroId: 'giant',
          stars: 2,
          items: [],
        },
      ],
      mid: [
        {
          uid: 'demo-2',
          heroId: 'pyromancer',
          stars: 1,
          items: [],
        },
      ],
      bot: [
        {
          uid: 'demo-3',
          heroId: 'archer',
          stars: 2,
          items: [],
        },
        {
          uid: 'demo-4',
          heroId: 'acolyte',
          stars: 1,
          items: [],
        },
      ],
    },
    {
      top: [
        {
          uid: 'demo-5',
          heroId: 'blademaster',
          stars: 1,
          items: [],
        },
        {
          uid: 'demo-6',
          heroId: 'warden',
          stars: 1,
          items: [],
        },
      ],
      mid: [
        {
          uid: 'demo-7',
          heroId: 'frostWitch',
          stars: 1,
          items: [],
        },
      ],
      bot: [
        {
          uid: 'demo-8',
          heroId: 'butcher',
          stars: 1,
          items: [],
        },
      ],
    },
  ],
  structures: [
    freshStructures(),
    {
      ...freshStructures(),
      bot: 620,
    },
  ],
  selectedUid: null,
  inspectedUid: null,
}

const host = ref<HTMLElement | null>(null)
const renderer = useBoardRenderer(host)
watch(renderer, (board) => board?.showPlanning(DEMO, false), { immediate: true })
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
