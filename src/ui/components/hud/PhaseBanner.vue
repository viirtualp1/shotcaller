<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'

const VISIBLE_MS = 1300

const store = useMatchStore()
const { t } = useGameText()

const shown = ref<{ key: string; title: string; subtitle: string; tone: 'plan' | 'fight' } | null>(null)

const { start } = useTimeoutFn(() => (shown.value = null), VISIBLE_MS, { immediate: false })

const trigger = computed(() => `${store.phase}:${store.view?.round}`)

watch(
  trigger,
  () => {
    const round = store.view?.round ?? 1
    if (store.phase === 'planning') {
      shown.value = {
        key: trigger.value,
        title: t('banner.planning', { round }),
        subtitle: t('banner.planningSub'),
        tone: 'plan',
      }
    } else if (store.phase === 'battle') {
      shown.value = {
        key: trigger.value,
        title: t('banner.battle'),
        subtitle: t('banner.battleSub', { round }),
        tone: 'fight',
      }
    } else {
      return
    }

    start()
  },
  { immediate: true },
)
</script>

<template>
  <Transition name="banner">
    <div v-if="shown" :key="shown.key" class="banner" :class="shown.tone" aria-live="polite">
      <span class="title hand">{{ shown.title }}</span>
      <span class="subtitle">{{ shown.subtitle }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.banner {
  position: fixed;
  left: 50%;
  top: 38%;
  translate: -50% -50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 48px 14px;
  pointer-events: none;
  z-index: 30;
  background: radial-gradient(ellipse at center, rgba(10, 14, 12, 0.78), transparent 70%);
}

.title {
  font-size: clamp(56px, 8vw, 96px);
  line-height: 1;
  color: var(--gold);
  text-shadow: 0 4px 18px rgba(0, 0, 0, 0.7);
}

.fight .title {
  color: var(--theirs);
}

.subtitle {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--chalk);
}

.banner-enter-active {
  transition:
    opacity 0.25s,
    transform 0.45s cubic-bezier(0.2, 1.6, 0.4, 1);
}

.banner-leave-active {
  transition:
    opacity 0.35s,
    transform 0.35s ease-in;
}

.banner-enter-from {
  opacity: 0;
  transform: scale(0.6);
}

.banner-leave-to {
  opacity: 0;
  transform: scale(1.15);
}
</style>
