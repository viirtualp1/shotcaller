<script setup lang="ts">
import { FastForward, SkipForward } from 'lucide-vue-next'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed, ref } from 'vue'
import { DUEL_BATTLE_SPEED } from '@/content/rules'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore, type BattleSpeed } from '../../stores/match'
import HudPanel from '../common/HudPanel.vue'
import DamageMeter, { type MeterStat } from './DamageMeter.vue'

const SPEEDS: readonly BattleSpeed[] = [1, 2, 4]
const METER_STATS: readonly MeterStat[] = ['damageDealt', 'healing', 'damageReceived']

const store = useMatchStore()
const { t } = useGameText()
const meter = ref<MeterStat>('damageDealt')

const meterModel = computed({
  get: () => meter.value,
  set: (value: string | undefined) => {
    if (value) {
      meter.value = value as MeterStat
    }
  },
})

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

    <HudPanel :title="t('battle.meter')">
      <template #actions>
        <ToggleGroupRoot
          v-model="meterModel"
          type="single"
          class="meter-tabs"
          :aria-label="t('battle.meter')"
        >
          <ToggleGroupItem v-for="stat in METER_STATS" :key="stat" :value="stat" class="meter-tab">
            {{ t(`battle.${stat}`) }}
          </ToggleGroupItem>
        </ToggleGroupRoot>
      </template>

      <DamageMeter :stat="meterModel" />
    </HudPanel>
  </div>
</template>

<style scoped>
.battle {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.meter-tabs {
  display: flex;
  gap: 2px;
  margin-left: auto;
  padding: 2px;
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.25);
}

.meter-tab {
  padding: 3px 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--chalk-dim);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.meter-tab[data-state='on'] {
  background: rgba(255, 255, 255, 0.1);
  color: var(--chalk);
}

.skip {
  margin-left: auto;
  min-height: 30px;
  padding: 4px 10px;
  font-size: 12px;
}
</style>
