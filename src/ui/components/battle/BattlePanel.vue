<script setup lang="ts">
import { FastForward, SkipForward } from 'lucide-vue-next'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed, ref } from 'vue'
import { DUEL_BATTLE_SPEED } from '@/content/rules'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore, type BattleSpeed } from '../../stores/match'
import HudPanel from '../common/HudPanel.vue'
import DamageMeter, { type MeterStat } from './DamageMeter.vue'
import MeterTabs from './MeterTabs.vue'

const SPEEDS: readonly BattleSpeed[] = [1, 2, 4]

const store = useMatchStore()
const { t } = useGameText()
const meter = ref<MeterStat>('damageDealt')

const speedModel = computed({
  get: () => String(store.isDuel ? DUEL_BATTLE_SPEED : store.speed),
  set: (value: string | undefined) => {
    if (value) {
      store.speed = Number(value) as BattleSpeed
    }
  },
})
</script>

<template>
  <div class="battle">
    <HudPanel>
      <div class="controls">
        <FastForward :size="16" class="icon" />

        <ToggleGroupRoot
          v-model="speedModel"
          type="single"
          class="speeds"
          :disabled="store.isDuel"
          :title="store.isDuel ? t('battle.duelSpeed') : undefined"
          :aria-label="t('battle.speed')"
        >
          <ToggleGroupItem v-for="s in SPEEDS" :key="s" :value="String(s)" class="speed"
            >×{{ s }}</ToggleGroupItem
          >
        </ToggleGroupRoot>

        <button
          type="button"
          class="btn skip"
          :disabled="store.phase !== 'battle'"
          @click="store.skipBattle()"
        >
          <SkipForward :size="14" /> {{ t('battle.skip') }}
        </button>
      </div>
    </HudPanel>

    <HudPanel class="meter-panel">
      <MeterTabs v-model="meter" />

      <DamageMeter :stat="meter" />
    </HudPanel>
  </div>
</template>

<style scoped>
.battle {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.meter-panel {
  flex: 1 1 auto;
  min-height: 0;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  color: var(--chalk-dim);
}

.speeds {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
}

.speed {
  min-width: 40px;
  padding: 5px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  transition: background 0.15s;
}

.speed[data-state='on'] {
  background: var(--gold);
  color: var(--ink);
}

.speed[data-disabled] {
  cursor: default;
}

.speed[data-disabled]:not([data-state='on']) {
  opacity: 0.4;
}

.skip {
  margin-left: auto;
  min-height: 30px;
  padding: 4px 10px;
  font-size: 12px;
}
</style>
