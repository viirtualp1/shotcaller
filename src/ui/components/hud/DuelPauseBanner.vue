<script setup lang="ts">
import { Play } from '@lucide/vue'
import { useGameText } from '../../composables/useGameText'
import { useDuelStore } from '../../stores/duel'

/** Shown to both coaches while the duel is paused, with the way back to the game. */
const duel = useDuelStore()
const { t } = useGameText()
</script>

<template>
  <Transition name="fade">
    <div v-if="duel.paused" class="duel-paused" role="status" aria-live="polite">
      <div class="banner">
        <span class="title hand">{{ t('duel.pause.title') }}</span>

        <span class="by">
          {{
            duel.pausedByMe
              ? t('duel.pause.byYou')
              : t('duel.pause.byOpponent', { name: duel.active?.opponent.name ?? '' })
          }}
        </span>

        <span v-if="duel.resumesIn !== null" class="ends">{{
          t('duel.pause.endsIn', { s: duel.resumesIn })
        }}</span>

        <button
          type="button"
          class="btn primary resume"
          :disabled="duel.pausing || (duel.resumeIn ?? 0) > 0"
          @click="duel.unpause()"
        >
          <Play :size="16" />
          {{
            (duel.resumeIn ?? 0) > 0 ? t('duel.pause.resumeIn', { s: duel.resumeIn }) : t('duel.pause.resume')
          }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* The board dims, but the menu stays within reach: only the banner takes clicks. */
.duel-paused {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(8, 12, 11, 0.45);
  pointer-events: none;
}

.banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 48px 20px;
  background: radial-gradient(ellipse at center, rgba(10, 14, 12, 0.85), transparent 72%);
  text-align: center;
}

.title {
  font-size: clamp(56px, 8vw, 96px);
  line-height: 1;
  color: var(--gold);
  text-shadow: 0 4px 18px rgba(0, 0, 0, 0.7);
}

.by {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--chalk);
}

.ends {
  font-size: 13px;
  color: var(--chalk-dim);
  font-variant-numeric: tabular-nums;
}

.resume {
  margin-top: 8px;
  pointer-events: auto;
  font-variant-numeric: tabular-nums;
}
</style>
