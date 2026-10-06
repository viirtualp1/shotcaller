<script setup lang="ts">
import { FastForward, Pause, Play, SkipForward, Square } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed, onUnmounted, ref } from 'vue'
import { DUEL_BATTLE_SPEED } from '@/content/rules'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore, type BattleSpeed } from '../../stores/match'
import { usePauseStore } from '../../stores/pause'
import HudPanel from '../common/HudPanel.vue'
import TrainingOrders from '../hud/TrainingOrders.vue'
import CameraControls from './CameraControls.vue'
import DamageMeter, { type MeterStat } from './DamageMeter.vue'
import MeterTabs from './MeterTabs.vue'

const SPEEDS: readonly BattleSpeed[] = [1, 2, 4]

const store = useMatchStore()
const pause = usePauseStore()
const { t } = useGameText()
/** Touch screens zoom the map; the camera can follow a lane. */
const touch = useMediaQuery('(pointer: coarse)')
const meter = ref<MeterStat>('damageDealt')

/** The training ground: the battle can be paused to look around, and without a clock it is stopped by hand. */
const training = computed(() => store.view?.sandbox ?? null)

const speedModel = computed({
  get: () => String(store.isDuel ? DUEL_BATTLE_SPEED : store.speed),
  set: (value: string | undefined) => {
    if (value) {
      store.speed = Number(value) as BattleSpeed
    }
  },
})

/* A paused training battle that ends, or is left, does not keep the next one paused. */
onUnmounted(() => pause.set('training', false))
</script>

<template>
  <div class="battle">
    <HudPanel>
      <TrainingOrders />

      <div class="controls">
        <button
          v-if="training"
          type="button"
          class="btn pause"
          :aria-pressed="pause.paused"
          :aria-label="t(pause.paused ? 'sandbox.resume' : 'sandbox.pause')"
          :title="t(pause.paused ? 'sandbox.resume' : 'sandbox.pause')"
          :disabled="store.phase !== 'battle'"
          @click="pause.set('training', !pause.paused)"
        >
          <Play v-if="pause.paused" :size="14" />
          <Pause v-else :size="14" />
        </button>

        <FastForward v-else :size="16" class="icon" />

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
          <template v-if="training?.endless">
            <Square :size="14" /> <span class="button-label">{{ t('sandbox.stop') }}</span>
          </template>

          <template v-else>
            <SkipForward :size="14" /> <span class="button-label">{{ t('battle.skip') }}</span>
          </template>
        </button>
      </div>

      <CameraControls v-if="touch" class="camera" />
    </HudPanel>

    <HudPanel class="meter-panel">
      <MeterTabs v-model="meter" :training="training !== null" />

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

.camera {
  margin-top: 8px;
}

.icon {
  color: var(--chalk-dim);
}

.speeds {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.25);
}

.speed {
  min-width: 40px;
  padding: 5px 8px;
  border: 0;
  border-radius: var(--radius);
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

.skip,
.pause {
  min-height: 30px;
  padding: 4px 10px;
  font-size: 12px;
  line-height: 1;
}

.skip {
  margin-left: auto;
}

/* Onest's glyphs sit above the optical center of its line box. Keep this correction local to icon labels. */
.button-label {
  line-height: 14px;
  padding-top: 1px;
}

.pause {
  width: 30px;
  padding-inline: 0;
  flex: none;
}
</style>
