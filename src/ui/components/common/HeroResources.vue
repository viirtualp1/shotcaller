<script setup lang="ts">
import { computed } from 'vue'
import type { HeroVitals } from '@/application/heroVitals'
import { useGameText } from '../../composables/useGameText'

const props = defineProps<{ values: HeroVitals }>()
const text = useGameText()
const { t } = text

const healthText = computed(() => text.number(Math.ceil(props.values.health)))
const manaText = computed(() => text.number(Math.floor(props.values.mana)))

const healthRegen = computed(() =>
  props.values.healthRegen > 0 ? t('card.peek.regen', { n: text.precise(props.values.healthRegen) }) : '',
)

const manaGain = computed(() => t('card.peek.manaGain', { n: text.precise(props.values.manaPerAttack) }))

function share(current: number, max: number) {
  if (max <= 0) {
    return 0
  }

  return Math.min(1, Math.max(0, current / max))
}
</script>

<template>
  <div class="resources">
    <div
      class="bar health"
      role="meter"
      :aria-label="t('card.hp')"
      :aria-valuemin="0"
      :aria-valuemax="Math.round(values.maxHealth)"
      :aria-valuenow="Math.ceil(values.health)"
    >
      <i class="fill" :style="{ width: `${share(values.health, values.maxHealth) * 100}%` }" />

      <span v-if="healthRegen" class="gain balance" aria-hidden="true">{{ healthRegen }}</span>

      <strong>{{ healthText }}</strong>

      <span v-if="healthRegen" class="gain">{{ healthRegen }}</span>
    </div>

    <div
      class="bar mana"
      role="meter"
      :aria-label="t('card.peek.mana')"
      :aria-valuemin="0"
      :aria-valuemax="Math.round(values.maxMana)"
      :aria-valuenow="Math.floor(values.mana)"
    >
      <i class="fill" :style="{ width: `${share(values.mana, values.maxMana) * 100}%` }" />

      <span class="gain balance" aria-hidden="true">{{ manaGain }}</span>

      <strong>{{ manaText }}</strong>

      <span class="gain">{{ manaGain }}</span>
    </div>
  </div>
</template>

<style scoped>
.resources {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar {
  position: relative;
  display: flex;
  align-items: center;
  height: 22px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(236, 232, 220, 0.16);
  color: var(--chalk);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.75);
}

.health {
  --color: color-mix(in srgb, var(--heal) 32%, var(--board-deep));
  background: var(--board-deep);
}

.mana {
  --color: var(--mana);
}

.fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: var(--color);
  transition: width 0.2s linear;
}

strong {
  position: relative;
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.gain {
  position: relative;
  flex: none;
  padding-right: 8px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.gain.balance {
  visibility: hidden;
  padding-right: 0;
  padding-left: 8px;
}

@media (prefers-reduced-motion: reduce) {
  .fill {
    transition: none;
  }
}
</style>
