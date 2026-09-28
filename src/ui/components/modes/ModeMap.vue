<script setup lang="ts">
import { computed } from 'vue'
import { TEAM_IDS, type ModeId } from '@/content/ids'
import { MAPS } from '@/content/map'
import { MODES } from '@/content/modes'
import { BATTLE } from '@/content/rules'
import { cssColor, TEAM_COLORS } from '@/rendering/theme'
import { laneMapFor } from '@/simulation/map/LaneMap'

/** A small drawing of a mode's map: lanes, towers, bases and relics, from the same data the battle uses. */
const props = withDefaults(defineProps<{ mode: ModeId; size?: number }>(), { size: 72 })

const WORLD = BATTLE.worldSize

const map = computed(() => {
  const lanes = laneMapFor(props.mode)
  const definition = MAPS[props.mode]

  const line = (points: readonly (readonly [number, number])[]) =>
    points.map(([x, y]) => `${x},${y}`).join(' ')

  return {
    abyss: definition.style === 'abyss',
    river: definition.river ? line(definition.river) : null,
    lanes: lanes.lanes.map((lane) => line(definition.lanes[lane] ?? [])),
    towers: TEAM_IDS.flatMap((team) =>
      MODES[props.mode].towers.map((slot) => ({
        key: `${team}-${slot}`,
        color: cssColor(TEAM_COLORS[team]),
        ...lanes.towerPosition(team, slot),
      })),
    ),
    bases: TEAM_IDS.map((team) => ({
      team,
      color: cssColor(TEAM_COLORS[team]),
      ...lanes.base(team),
    })),
    relics: lanes.relicPositions(),
  }
})
</script>

<template>
  <svg
    class="mode-map"
    :class="{ abyss: map.abyss }"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${WORLD} ${WORLD}`"
    aria-hidden="true"
  >
    <rect class="ground" x="10" y="10" :width="WORLD - 20" :height="WORLD - 20" rx="70" />
    <polyline v-if="map.river" class="river" :points="map.river" />

    <template v-if="map.abyss">
      <polyline v-for="(lane, i) in map.lanes" :key="`bridge-${i}`" class="bridge" :points="lane" />
    </template>

    <polyline v-for="(lane, i) in map.lanes" :key="i" class="lane" :points="lane" />

    <circle
      v-for="(relic, i) in map.relics"
      :key="`relic-${i}`"
      class="relic"
      :cx="relic.x"
      :cy="relic.y"
      r="34"
    />

    <rect
      v-for="tower in map.towers"
      :key="tower.key"
      :x="tower.x - 30"
      :y="tower.y - 30"
      width="60"
      height="60"
      rx="10"
      :fill="tower.color"
    />

    <circle v-for="base in map.bases" :key="base.team" :cx="base.x" :cy="base.y" r="62" :fill="base.color" />
  </svg>
</template>

<style scoped>
.mode-map {
  flex: none;
  display: block;
}

.ground {
  fill: rgba(255, 255, 255, 0.04);
  stroke: var(--edge-strong);
  stroke-width: 14;
}

.abyss .ground {
  fill: rgba(0, 0, 0, 0.35);
}

.river {
  fill: none;
  stroke: rgba(120, 180, 210, 0.22);
  stroke-width: 70;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bridge {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 150;
}

.lane {
  fill: none;
  stroke: var(--chalk-dim);
  stroke-width: 26;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.relic {
  fill: none;
  stroke: var(--heal);
  stroke-width: 14;
}
</style>
