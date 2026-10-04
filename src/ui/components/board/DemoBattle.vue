<script setup lang="ts">
import { useDocumentVisibility, useMediaQuery, useRafFn } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { BattleSession } from '@/application/BattleSession'
import type { ModeId } from '@/content/ids'
import { demoBattle } from '@/domain/demo/demoBattle'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import { useBoardRenderer } from '../../composables/useBoardRenderer'

/**
 * Two bots fighting on the mode's map, for show. When a fight ends, a new one starts.
 * The board fades in once it is drawn and says so, so the one underneath can go.
 */
const props = withDefaults(defineProps<{ mode: ModeId; paused?: boolean }>(), { paused: false })
const emit = defineEmits<{ shown: [] }>()

const host = ref<HTMLElement | null>(null)
const running = computed(() => !props.paused)
const renderer = useBoardRenderer(host, 0, props.mode, running)
/* With reduced motion the fight is only set up, never played, and the board shows at once. */
const still = useMediaQuery('(prefers-reduced-motion: reduce)')
const visibility = useDocumentVisibility()

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

watch(renderer, () => {
  renderer.value?.setMaxFPS(30)
  nextFight()

  if (still.value) {
    emit('shown')
  }
})

useRafFn(({ delta }) => {
  if (!session || still.value || props.paused || visibility.value !== 'visible') {
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
  <div
    ref="host"
    class="demo"
    :class="{ ready: renderer }"
    aria-hidden="true"
    @transitionend.self="emit('shown')"
  />
</template>

<style scoped>
.demo {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.9s ease;
  pointer-events: none;
}

.demo.ready {
  opacity: 1;
}
</style>
