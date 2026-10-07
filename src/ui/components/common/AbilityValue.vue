<script setup lang="ts">
import {
  Clock,
  Crosshair,
  Gauge,
  Heart,
  HeartPulse,
  Shield,
  Sparkles,
  Swords,
  Timer,
  Zap,
  Snail,
} from '@lucide/vue'
import type { AbilityValueKind } from '../../abilityValueKinds'
import { useGameText } from '../../composables/useGameText'
import StatValue from './StatValue.vue'

const ICONS = {
  physicalDamage: Swords,
  magicalDamage: Zap,
  health: Heart,
  healing: HeartPulse,
  shield: Shield,
  duration: Clock,
  interval: Timer,
  range: Crosshair,
  count: null,
  speed: Gauge,
  slow: Snail,
  damageBonus: Sparkles,
  damageReduction: Shield,
  strength: Sparkles,
} satisfies Record<AbilityValueKind, unknown>

const props = defineProps<{
  kind: AbilityValueKind | null
  base: string
  bonus?: string | null
  better?: boolean
}>()

const { t } = useGameText()
</script>

<template>
  <span
    class="ability-value"
    :class="props.kind"
    :title="props.kind ? t(`abilityValueKinds.${props.kind}`) : undefined"
  >
    <component
      :is="ICONS[props.kind]"
      v-if="props.kind && ICONS[props.kind]"
      :size="12"
      class="value-icon"
      aria-hidden="true"
    />

    <StatValue :base="props.base" :bonus="props.bonus" :better="props.better" />
  </span>
</template>

<style scoped>
.ability-value {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  color: var(--chalk);
  font-weight: 700;
  white-space: nowrap;
}

.value-icon {
  align-self: center;
  flex: none;
}

.physicalDamage {
  color: var(--damage-physical);
}

.magicalDamage {
  color: var(--damage-magical);
}

.health,
.healing {
  color: var(--heal);
}

.duration,
.interval,
.speed {
  color: var(--gold);
}

.shield,
.damageReduction {
  color: var(--ours);
}

.slow,
.damageBonus,
.strength {
  color: var(--effect);
}

.ability-value :deep(.bonus),
.ability-value :deep(.bonus.worse) {
  color: inherit;
}
</style>
