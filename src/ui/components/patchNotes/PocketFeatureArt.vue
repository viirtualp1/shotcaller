<script setup lang="ts">
import { ArrowUp, BatteryCharging, MoveVertical, Sun, Vibrate, ZoomIn } from '@lucide/vue'
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import ModeMap from '../modes/ModeMap.vue'

/* Fixed 9.4 examples: sample heroes and values, apart from the player's account and the current balance. */
defineProps<{ focus: 'camera' | 'sheet' | 'placement' | 'comfort' }>()

const settings = useSettingsStore()

const copy = computed(() =>
  settings.locale === 'ru'
    ? {
        follow: 'Камера следит за верхом',
        panel: 'Панель боя',
        speed: 'Скорость',
        swipe: 'Потяни вниз — и она уйдёт',
        bench: 'Герои',
        onMap: 'На карте 2 из 3',
        drop: 'Верх',
        buzz: 'Герой на линии',
        awake: 'Экран не гаснет',
        saver: 'Экономия заряда',
        frames: '30 кадров вместо 60',
      }
    : {
        follow: 'The camera follows top',
        panel: 'Battle panel',
        speed: 'Speed',
        swipe: 'Pull it down to put it away',
        bench: 'Heroes',
        onMap: 'On map 2 of 3',
        drop: 'Top',
        buzz: 'Hero on the lane',
        awake: 'The screen stays on',
        saver: 'Battery saver',
        frames: '30 frames instead of 60',
      },
)
</script>

<template>
  <!-- No class per focus: "sheet" would pick up the global dialog style. -->
  <div class="illustration">
    <template v-if="focus === 'camera'">
      <div class="lens">
        <div class="overview">
          <ModeMap mode="twoLanes" :size="150" />
          <span class="frame" />
        </div>

        <div class="close-up">
          <div class="duel">
            <HeroAvatar hero-id="giant" :size="60" :stars="2" />
            <span class="versus hand">×2.4</span>
            <HeroAvatar hero-id="butcher" :team="1" :size="60" />
          </div>

          <span class="caption"><ZoomIn :size="14" /> {{ copy.follow }}</span>
        </div>
      </div>
    </template>

    <template v-else-if="focus === 'sheet'">
      <div class="handset">
        <div class="field">
          <ModeMap mode="twoLanes" :size="150" />
        </div>

        <div class="sheet-card">
          <span class="grabber" />
          <span class="sheet-title">{{ copy.panel }}</span>

          <div class="speeds">
            <span>×1</span>
            <span class="on">×2</span>
            <span>×4</span>
          </div>

          <div class="bars"><i /><i /></div>
        </div>
      </div>

      <span class="caption"><MoveVertical :size="14" /> {{ copy.swipe }}</span>
    </template>

    <template v-else-if="focus === 'placement'">
      <div class="placement-card">
        <div class="strip-head">
          <span>{{ copy.bench }}</span>
          <small>{{ copy.onMap }}</small>
        </div>

        <div class="strip">
          <span class="slot picked"><HeroAvatar hero-id="changeling" :size="34" /></span>
          <span class="slot"><HeroAvatar hero-id="acolyte" :size="34" /></span>
          <span class="slot empty" />
        </div>

        <div class="lane-target">
          <ArrowUp :size="18" class="lift" />
          <span class="hand">{{ copy.drop }}</span>
        </div>

        <span class="buzz"><Vibrate :size="16" /> {{ copy.buzz }}</span>
      </div>
    </template>

    <template v-else>
      <div class="comfort">
        <div class="awake">
          <Sun :size="34" />
          <strong class="hand">{{ copy.awake }}</strong>
        </div>

        <div class="saver">
          <BatteryCharging :size="22" />

          <div>
            <strong>{{ copy.saver }}</strong>
            <small>{{ copy.frames }}</small>
          </div>

          <span class="switch" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.illustration {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 24px;
}

.caption {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--chalk-dim);
  font-size: 11px;
  text-align: center;
}

.lens {
  display: flex;
  align-items: center;
  gap: 18px;
}

.overview {
  position: relative;
  padding: 8px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #17221c;
}

.overview :deep(.mode-map) {
  display: block;
  opacity: 0.85;
}

.frame {
  position: absolute;
  top: 12px;
  left: 50%;
  width: 66px;
  height: 42px;
  translate: -50% 0;
  border: 2px dashed var(--gold);
  border-radius: 6px;
}

.close-up {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid #f4c55b66;
  border-radius: var(--radius);
  background: linear-gradient(145deg, #2a2a1c, #172019);
  box-shadow: 0 15px 35px #0005;
}

.duel {
  display: flex;
  align-items: center;
  gap: 12px;
}

.versus {
  color: var(--gold);
  font-size: 32px;
}

.handset {
  position: relative;
  width: 210px;
  height: 220px;
  overflow: hidden;
  border: 1px solid #cdd6ba33;
  border-radius: 24px 24px 0 0;
  border-bottom: 0;
  background: #18221f;
}

.field {
  display: grid;
  place-items: center;
  padding-top: 8px;
  opacity: 0.55;
}

.sheet-card {
  position: absolute;
  inset: auto 0 0;
  display: grid;
  gap: 10px;
  padding: 8px 14px 14px;
  border-top: 1px solid var(--edge-strong);
  border-radius: var(--radius) var(--radius) 0 0;
  background: #111815f5;
  box-shadow: 0 -12px 30px #0006;
}

.grabber {
  justify-self: center;
  width: 60px;
  height: 5px;
  border-radius: 999px;
  background: var(--gold);
  box-shadow: 0 0 10px #f4c55b66;
}

.sheet-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.speeds {
  display: flex;
  gap: 3px;
  padding: 2px;
  border-radius: var(--radius);
  background: #0004;
}

.speeds span {
  flex: 1;
  padding: 4px 0;
  border-radius: var(--radius);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  color: var(--chalk-dim);
}

.speeds .on {
  background: var(--gold);
  color: var(--ink);
}

.bars {
  display: grid;
  gap: 6px;
}

.bars i {
  height: 5px;
  border-radius: 99px;
  background: var(--ours);
  opacity: 0.6;
}

.bars i + i {
  width: 60%;
}

.placement-card {
  display: grid;
  gap: 12px;
  width: min(100%, 260px);
  padding: 18px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #1b2922;
  box-shadow: 0 15px 35px #0005;
}

.strip-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.strip-head small {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.strip {
  display: flex;
  gap: 8px;
}

.slot {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px dashed var(--edge);
  border-radius: var(--radius);
}

.slot.picked {
  border-style: solid;
  border-color: var(--gold);
  box-shadow: 0 0 0 1px var(--gold);
}

.lane-target {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px dashed #f4c55b80;
  border-radius: var(--radius);
  color: var(--gold);
}

.lane-target span {
  font-size: 22px;
  line-height: 1;
}

.buzz {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--heal);
  font-size: 12px;
  font-weight: 700;
}

.comfort {
  display: grid;
  gap: 16px;
  width: min(100%, 270px);
}

.awake {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 1px solid #f4c55b66;
  border-radius: var(--radius);
  background: radial-gradient(circle at 18% 50%, #f4c55b33, transparent 60%), #1b2922;
  color: var(--gold);
  box-shadow: 0 15px 35px #0005;
}

.awake strong {
  font-size: 24px;
  line-height: 1.05;
}

.saver {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: #17221c;
  color: var(--heal);
}

.saver div {
  display: grid;
  flex: 1;
  gap: 2px;
}

.saver strong {
  color: var(--chalk);
  font-size: 13px;
}

.saver small {
  color: var(--chalk-dim);
  font-size: 11px;
}

/* A switch in the "on" position: a progress-track shape, so it keeps its pill. */
.switch {
  position: relative;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: var(--gold);
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  right: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink);
}

@media (max-width: 380px) {
  .illustration {
    padding: 16px;
    gap: 12px;
  }

  .lens {
    gap: 10px;
  }

  .overview :deep(.mode-map) {
    width: 90px;
    height: 90px;
  }

  .close-up {
    padding: 12px;
  }
}
</style>
