<script setup lang="ts">
import { Crown } from 'lucide-vue-next'
import { computed } from 'vue'
import { LANE_IDS, type TeamId } from '@/content/ids'
import { STRUCTURES } from '@/content/units'
import type { StructureState } from '@/domain/battle/contracts'
import { useGameText } from '../../composables/useGameText'

const props = defineProps<{ team: TeamId; structures: StructureState }>()

const text = useGameText()
const { t } = text

const throneRatio = computed(() => props.structures.throne / STRUCTURES.throne.hp)

const throneTitle = computed(
  () => `${t('hud.throne')}: ${text.number(props.structures.throne)} / ${text.number(STRUCTURES.throne.hp)}`,
)

const towers = computed(() =>
  LANE_IDS.map((lane) => ({
    lane,
    ratio: props.structures[lane] / STRUCTURES.tower.hp,
  })),
)
</script>

<template>
  <div class="base" :class="team === 0 ? 'ours' : 'theirs'">
    <span class="who">{{ team === 0 ? t('teams.ours') : t('teams.theirs') }}</span>

    <span class="towers" :aria-label="t('hud.towers')">
      <i
        v-for="tower in towers"
        :key="tower.lane"
        :title="`${text.slotName(tower.lane)}: ${text.number(structures[tower.lane])}`"
        :class="{ down: tower.ratio <= 0 }"
        :style="{ '--fill': `${tower.ratio * 100}%` }"
      />
    </span>

    <span
      class="throne"
      :class="{ hurt: throneRatio < 1 }"
      :title="throneTitle"
      :aria-label="throneTitle"
      :style="{ '--fill': `${throneRatio * 100}%` }"
    >
      <Crown :size="15" />
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
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1.5px solid var(--team);
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--team) 45%, transparent) var(--fill),
    transparent var(--fill)
  );
  color: var(--chalk);
  transition: background 0.4s ease-out;
}

.throne.hurt {
  animation: throne-hurt 1.6s ease-in-out infinite;
}

@keyframes throne-hurt {
  50% {
    box-shadow: 0 0 10px color-mix(in srgb, var(--team) 60%, transparent);
  }
}
</style>
