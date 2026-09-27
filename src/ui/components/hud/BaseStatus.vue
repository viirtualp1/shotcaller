<script setup lang="ts">
import { computed } from 'vue'
import { LANE_IDS, type TeamId } from '@/content/ids'
import { STRUCTURES } from '@/content/units'
import type { StructureState } from '@/domain/battle/contracts'
import AnimatedNumber from '../common/AnimatedNumber.vue'
import { useGameText } from '../../composables/useGameText'

const props = defineProps<{ team: TeamId; structures: StructureState }>()
const text = useGameText()
const { t } = text

const throneRatio = computed(() => props.structures.throne / STRUCTURES.throne.hp)
const towers = computed(() =>
  LANE_IDS.map((lane) => ({ lane, ratio: props.structures[lane] / STRUCTURES.tower.hp })),
)
</script>

<template>
  <div class="base" :class="team === 0 ? 'ours' : 'theirs'">
    <span class="who">{{ team === 0 ? t('teams.ours') : t('teams.theirs') }}</span>
    <span class="towers" :aria-label="t('hud.towers')">
      <i
        v-for="tower in towers"
        :key="tower.lane"
        :title="`${text.slotName(tower.lane)}: ${structures[tower.lane]}`"
        :class="{ down: tower.ratio <= 0 }"
        :style="{ '--fill': `${tower.ratio * 100}%` }"
      />
    </span>
    <span class="throne" :title="`${t('hud.throne')}: ${structures.throne}`">
      <span class="bar"><i :style="{ width: `${throneRatio * 100}%` }" /></span>
      <AnimatedNumber class="hp" :value="structures.throne" />
    </span>
  </div>
</template>

<style scoped>
.base {
  --team: var(--ours);
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.theirs {
  --team: var(--theirs);
  flex-direction: row-reverse;
}

.theirs .throne {
  flex-direction: row-reverse;
}

.who {
  font-weight: 700;
  color: var(--team);
}

.towers {
  display: inline-flex;
  gap: 5px;
}

.towers i {
  width: 10px;
  height: 10px;
  rotate: 45deg;
  border: 1.5px solid var(--team);
  background: linear-gradient(to top, var(--team) var(--fill), transparent var(--fill));
  transition: opacity 0.3s;
}

.towers i.down {
  border-color: var(--chalk-faint);
  opacity: 0.45;
}

.throne {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.bar {
  width: 92px;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  background: var(--team);
  transition: width 0.4s ease-out;
}

.hp {
  min-width: 2.6em;
  font-size: 13px;
  color: var(--chalk);
}
</style>
