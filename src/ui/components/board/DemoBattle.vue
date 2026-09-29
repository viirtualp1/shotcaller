<script setup lang="ts">
import { useMediaQuery, useRafFn } from '@vueuse/core'
import { onBeforeUnmount, ref, watch } from 'vue'
import { BattleSession } from '@/application/BattleSession'
import type { ModeId } from '@/content/ids'
import { demoBattle } from '@/domain/demo/demoBattle'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import { useBoardRenderer } from '../../composables/useBoardRenderer'

/** Two bots fighting on the mode's map, for show. When a fight ends, a new one starts. */
const props = defineProps<{ mode: ModeId }>()

const host = ref<HTMLElement | null>(null)
const renderer = useBoardRenderer(host, 0, props.mode)
/* With reduced motion the fight is only set up, never played. */
const still = useMediaQuery('(prefers-reduced-motion: reduce)')

let session: BattleSession | null = null

function nextFight() {
  const board = renderer.value
  if (!board) {
    return
  }

  session?.dispose()
  session = new BattleSession(new BattleSimulation(demoBattle(props.mode, globalThis.crypto.randomUUID())))
  board.showBattle(session.simulation)
}

watch(renderer, nextFight)

useRafFn(({ delta }) => {
  if (!session || still.value) {
    return
  }

  session.advance(delta / 1000, 1)

  if (session.isOver) {
    nextFight()
  }
})

onBeforeUnmount(() => session?.dispose())
</script>

<template>
  <div ref="host" class="demo" aria-hidden="true" />
</template>

<style scoped>
.demo {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
