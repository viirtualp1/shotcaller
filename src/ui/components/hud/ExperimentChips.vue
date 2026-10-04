<script setup lang="ts">
import { Shuffle, Sparkles } from '@lucide/vue'
import { computed } from 'vue'
import { TWISTS } from '@/content/experiments'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'
import InfoTooltip from '../common/InfoTooltip.vue'

/** The experiments a match plays with: the round's twist, and the heroes rotation left in the pool. */
const match = useMatchStore()
const text = useGameText()
const { t } = text
const twist = computed(() => match.view?.twist ?? null)
const rotation = computed(() => match.view?.rotation ?? null)
</script>

<template>
  <div v-if="twist || rotation" class="chips">
    <InfoTooltip v-if="twist" side="bottom">
      <Transition name="twist" mode="out-in">
        <span
          :key="twist"
          class="chip twist"
          tabindex="0"
          :style="{ '--twist': cssColor(TWISTS[twist].color) }"
        >
          <Sparkles :size="13" /> {{ text.twistName(twist) }}
        </span>
      </Transition>

      <template #content>
        <strong>{{ t('experiments.twist') }}</strong>
        <p>{{ text.twistEffect(twist) }}</p>
      </template>
    </InfoTooltip>

    <InfoTooltip v-if="rotation" side="bottom">
      <span class="chip rotation" tabindex="0"><Shuffle :size="13" /> {{ t('experiments.rotation') }}</span>

      <template #content>
        <strong>{{ t('experiments.rotationHint') }}</strong>

        <span class="roster">
          <HeroAvatar v-for="id in rotation" :key="id" :hero-id="id" :size="26" />
        </span>
      </template>
    </InfoTooltip>
  </div>
</template>

<style scoped>
.chips {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 4px;
}

.chip {
  --twist: var(--gold);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border: 1px solid color-mix(in srgb, var(--twist) 60%, transparent);
  border-radius: 0 0 var(--radius) var(--radius);
  background: color-mix(in srgb, var(--twist) 14%, var(--panel));
  color: var(--twist);
  font-size: 12px;
  white-space: nowrap;
  cursor: help;
}

.chip.rotation {
  --twist: var(--chalk-dim);
}

p {
  margin: 4px 0 0;
  max-width: 32ch;
  color: var(--chalk-dim);
}

.roster {
  display: grid;
  grid-template-columns: repeat(5, 26px);
  gap: 8px 6px;
  margin-top: 8px;
}

.twist-enter-active,
.twist-leave-active {
  transition:
    opacity 0.25s,
    translate 0.25s;
}

.twist-enter-from {
  opacity: 0;
  translate: 0 -6px;
}

.twist-leave-to {
  opacity: 0;
  translate: 0 6px;
}
</style>
