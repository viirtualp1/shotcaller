<script setup lang="ts">
import { Shuffle, Sparkles } from '@lucide/vue'
import { useTimeoutFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { TWISTS } from '@/content/experiments'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'
import InfoTooltip from '../common/InfoTooltip.vue'
import { TWIST_NOTICE_MS } from './twistNotice'

/** The experiments a match plays with: the round's twist, and the heroes rotation left in the pool. */
const match = useMatchStore()
const text = useGameText()
const { t } = text
const changed = ref(false)
const twist = computed(() => match.view?.twist ?? null)
const rotation = computed(() => match.view?.rotation ?? null)

const { start } = useTimeoutFn(
  () => {
    changed.value = false
  },
  TWIST_NOTICE_MS,
  { immediate: false },
)

watch(
  twist,
  (current, previous) => {
    if (!current || current === previous) {
      return
    }

    changed.value = true
    start()
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="twist || rotation" class="chips">
    <InfoTooltip v-if="twist" side="bottom" clickable>
      <button type="button" class="chip twist" :style="{ '--twist': cssColor(TWISTS[twist].color) }">
        <Sparkles :size="13" /> {{ text.twistName(twist) }}
      </button>

      <template #content>
        <strong>{{ t('experiments.twist') }}</strong>
        <p>{{ text.twistEffect(twist) }}</p>
      </template>
    </InfoTooltip>

    <InfoTooltip v-if="rotation" side="bottom" clickable>
      <button type="button" class="chip rotation">
        <Shuffle :size="13" /> {{ t('experiments.rotation') }}
      </button>

      <template #content>
        <strong>{{ t('experiments.rotationHint') }}</strong>

        <span class="roster">
          <span v-for="id in rotation" :key="id" class="rotation-hero">
            <HeroAvatar :hero-id="id" :size="32" />
            <span>{{ text.heroName(id) }}</span>
          </span>
        </span>
      </template>
    </InfoTooltip>

    <Transition name="twist">
      <div v-if="changed && twist" :key="twist" class="twist-change" role="status">
        <Sparkles :size="20" />

        <div>
          <strong>{{ t('experiments.twistChanged') }} · {{ text.twistName(twist) }}</strong>
          <p>{{ text.twistEffect(twist) }}</p>
        </div>
      </div>
    </Transition>
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
  font-family: inherit;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 12px;
  width: min(280px, calc(100vw - 48px));
  margin-top: 8px;
}

.rotation-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
  font-size: 10px;
}

/* Hangs from the bottom of the scoreboard, as wide as it, like a page pulled out of the panel. */
.twist-change {
  position: absolute;
  z-index: 20;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: max(100%, min(360px, calc(100vw - 24px)));
  padding: 14px;
  border: 1px solid var(--gold);
  border-radius: 0 0 var(--radius) var(--radius);
  background: var(--panel);
  box-shadow: 0 10px 32px #0008;
  color: var(--gold);
  font-size: 13px;
  pointer-events: none;
}

.twist-change > svg {
  flex: none;
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
