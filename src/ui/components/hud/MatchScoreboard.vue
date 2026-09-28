<script setup lang="ts">
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import { useDuelStore } from '../../stores/duel'
import { usePlanningTimerStore } from '../../stores/planningTimer'
import BaseStatus from './BaseStatus.vue'

const URGENT_SECONDS = 10

const store = useMatchStore()
const timer = usePlanningTimerStore()
const duel = useDuelStore()
const { t } = useGameText()
const view = computed(() => store.view!)
const structures = computed(() => store.live?.structures ?? view.value.structures)

const secondsLeft = computed(() =>
  store.live ? Math.max(0, Math.ceil(store.live.duration - store.live.elapsed)) : null,
)

const planningLeft = computed(() =>
  store.isPlanning && timer.remaining !== null ? Math.ceil(timer.remaining) : null,
)

const urgent = computed(() => planningLeft.value !== null && planningLeft.value <= URGENT_SECONDS)

const progress = computed(() => {
  if (store.live && store.phase === 'battle') {
    return Math.min(1, store.live.elapsed / store.live.duration)
  }

  if (timer.remaining !== null && timer.total) {
    return Math.min(1, timer.remaining / timer.total)
  }

  return 0
})

const showProgress = computed(() => store.phase === 'battle' || planningLeft.value !== null)

const history = computed(() =>
  view.value.history.map((verdict, i) => ({
    verdict,
    round: i + 1,
  })),
)
</script>

<template>
  <div class="scoreboard" data-tour="scoreboard">
    <BaseStatus :team="0" :structures="structures[0]" :mode="store.view!.mode" />

    <div class="center">
      <span class="round">{{ t('hud.round', { round: view.round, max: view.maxRounds }) }}</span>

      <Transition name="phase" mode="out-in">
        <span v-if="store.awaiting" key="awaiting" class="phase awaiting">{{ t('duel.waiting') }}</span>

        <span v-else-if="store.phase === 'battle' && secondsLeft !== null" key="timer" class="phase battle">
          {{ t('battle.timeLeft', { s: secondsLeft }) }}
        </span>

        <span
          v-else-if="planningLeft !== null"
          key="planning"
          class="phase"
          :class="{ urgent, paused: timer.paused }"
          data-phase="planning"
        >
          {{ t('phase.planning') }} · {{ t('battle.timeLeft', { s: planningLeft }) }}
        </span>

        <span v-else :key="view.phase" class="phase" :data-phase="view.phase">{{
          t(`phase.${view.phase}`)
        }}</span>
      </Transition>

      <span class="progress" :class="{ visible: showProgress, planning: store.isPlanning, urgent }">
        <i :style="{ width: `${progress * 100}%` }" />
      </span>

      <span v-if="store.isDuel && store.isPlanning && duel.opponentReady" class="ready">
        {{ t('duel.opponentReady') }}
      </span>

      <TransitionGroup v-if="history.length" name="pop" tag="ol" class="history">
        <li
          v-for="entry in history"
          :key="entry.round"
          class="pip"
          :class="entry.verdict"
          :title="t(`summary.${entry.verdict}`, { round: entry.round })"
        />
      </TransitionGroup>
    </div>

    <BaseStatus
      :team="1"
      :structures="structures[1]"
      :mode="store.view!.mode"
      :name="store.duel?.opponentName"
    />
  </div>
</template>

<style scoped>
.scoreboard {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 8px 18px;
  border-radius: 0 0 16px 16px;
  background: rgba(17, 24, 21, 0.9);
  border: 1px solid var(--edge);
  border-top: 0;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}

.center {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 140px;
  gap: 2px;
}

.round {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.phase {
  font-family: var(--font-hand);
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  color: var(--gold);
  font-variant-numeric: tabular-nums;
}

.phase.awaiting {
  font-size: 22px;
  color: var(--chalk-dim);
}

.ready {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--heal);
}

.phase.battle {
  color: var(--theirs);
}

.phase[data-phase='summary'],
.phase[data-phase='finished'] {
  color: var(--chalk);
}

.progress {
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s;
}

.progress.visible {
  opacity: 1;
}

.progress i {
  display: block;
  height: 100%;
  background: var(--theirs);
}

.progress.planning i {
  background: var(--gold);
  transition: width 0.2s linear;
}

.progress.planning.urgent i {
  background: var(--theirs);
}

.history {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
  max-width: 210px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.pip {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--chalk-faint);
  opacity: 0.6;
}

.pip.win {
  background: var(--ours);
  opacity: 1;
}

.pip.loss {
  background: var(--theirs);
  opacity: 1;
}

.phase.urgent {
  color: var(--theirs);
  animation: urgent 1s ease-in-out infinite;
}

.phase.paused {
  opacity: 0.6;
}

@keyframes urgent {
  50% {
    transform: scale(1.08);
  }
}

.phase-enter-active,
.phase-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.phase-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.phase-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 760px) {
  .scoreboard {
    gap: 10px;
    padding: 6px 10px;
  }

  .scoreboard :deep(.bar) {
    width: 48px;
  }

  .scoreboard :deep(.who) {
    display: none;
  }
}

@media (max-width: 480px) {
  .scoreboard {
    gap: 8px;
    padding: 6px 8px;
  }

  .scoreboard :deep(.base) {
    gap: 6px;
  }

  .scoreboard :deep(.towers) {
    gap: 3px;
  }

  .center {
    min-width: 0;
  }

  .phase {
    font-size: 20px;
  }

  .history {
    max-width: 150px;
  }
}
</style>
