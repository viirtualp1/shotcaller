<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import type { LaneId } from '@/content/ids'
import type { Insets } from '@/rendering/BoardRenderer'
import type { PlanningModel } from '@/rendering/layers/PlanningLayer'
import type { HeroHit } from '@/rendering/views/HeroToken'
import type { BattleSimulation } from '@/simulation/BattleSimulation'
import { useBoardRenderer } from '../../composables/useBoardRenderer'
import { useBoardStore } from '../../stores/board'
import { useDragStore } from '../../stores/drag'
import { locateHero, useMatchStore } from '../../stores/match'
import MapHeroTooltip from './MapHeroTooltip.vue'

const props = defineProps<{ insets: Insets }>()

const store = useMatchStore()
const drag = useDragStore()
const boardStore = useBoardStore()
const host = ref<HTMLElement | null>(null)
const renderer = useBoardRenderer(host)
const hovered = shallowRef<HeroHit | null>(null)
let shownSimulation: BattleSimulation | null = null

function planningModel(): PlanningModel | null {
  const view = store.view
  if (!view) {
    return null
  }

  const lineup = (lanes: typeof view.human.lanes) => ({
    top: lanes.top.heroes,
    mid: lanes.mid.heroes,
    bot: lanes.bot.heroes,
  })

  return {
    lineups: [lineup(view.human.lanes), lineup(view.opponent.lanes)],
    structures: view.structures,
    selectedUid: store.selectedUid,
    inspectedUid: store.inspectedUid,
  }
}

watch(renderer, (board) => boardStore.register(board), { immediate: true })

watch([renderer, () => props.insets], ([board, insets]) => board?.setInsets(insets), { immediate: true })

watch(
  [renderer, () => store.view, () => store.selectedUid, () => store.inspectedUid, () => store.simulation],
  () => {
    const board = renderer.value
    if (!board) {
      return
    }

    const simulation = store.simulation
    if (simulation) {
      if (simulation !== shownSimulation) {
        board.showBattle(simulation)
      }

      shownSimulation = simulation

      return
    }

    shownSimulation = null
    const model = planningModel()
    if (model) {
      board.showPlanning(model, store.selectedUid !== null)
    }
  },
  { immediate: true },
)

watch(
  renderer,
  (board, _, onCleanup) => {
    if (!board) {
      return
    }

    const onLane = (lane: LaneId) => store.placeSelected(lane)
    const onHero = ({ uid, clientX, clientY }: { uid: string; clientX: number; clientY: number }) => {
      const located = store.view ? locateHero(store.view.human, uid) : null
      if (located) {
        drag.press(
          {
            kind: 'hero',
            uid,
            heroId: located.hero.heroId,
            stars: located.hero.stars,
          },
          clientX,
          clientY,
        )
      }
    }

    const onHover = (hit: HeroHit | null) => (hovered.value = hit)
    const onTap = (hit: HeroHit) => (hit.team === 0 ? store.select(hit.uid) : store.inspect(hit.uid))
    board.events.on('lanePicked', onLane)
    board.events.on('heroPressed', onHero)
    board.events.on('heroHovered', onHover)
    board.events.on('heroTapped', onTap)

    onCleanup(() => {
      board.events.off('lanePicked', onLane)
      board.events.off('heroPressed', onHero)
      board.events.off('heroHovered', onHover)
      board.events.off('heroTapped', onTap)
      hovered.value = null
      boardStore.register(null)
    })
  },
  { immediate: true },
)
</script>

<template>
  <div ref="host" class="board-host">
    <MapHeroTooltip
      v-if="renderer && hovered && !drag.payload"
      :key="hovered.uid"
      :renderer="renderer"
      :hit="hovered"
    />
  </div>
</template>

<style scoped>
.board-host {
  position: absolute;
  inset: 0;
  touch-action: none;
}

.board-host :deep(canvas) {
  display: block;
}
</style>
