<script setup lang="ts">
import { Droplet, Heart } from '@lucide/vue'
import type { HeroVitals } from '@/application/heroVitals'
import { useGameText } from '../../composables/useGameText'

defineProps<{ values: HeroVitals; live: boolean }>()
const text = useGameText()
const { t } = text
</script>

<template>
  <div class="resources">
    <div class="resource health">
      <div class="reading">
        <span><Heart :size="13" /> {{ t('card.hp') }}</span>

        <strong
          >{{ text.number(Math.ceil(values.health))
          }}<template v-if="live"> / {{ text.number(Math.round(values.maxHealth)) }}</template></strong
        >
      </div>

      <span class="track" aria-hidden="true"
        ><i :style="{ width: `${(values.health / values.maxHealth) * 100}%` }"
      /></span>

      <small v-if="values.healthRegen">{{
        t('card.peek.regen', { n: text.precise(values.healthRegen) })
      }}</small>
    </div>

    <div class="resource mana">
      <div class="reading">
        <span><Droplet :size="13" /> {{ t('card.peek.mana') }}</span>

        <strong
          ><template v-if="live">{{ text.number(Math.floor(values.mana)) }} / </template
          >{{ text.number(values.maxMana) }}</strong
        >
      </div>

      <span v-if="live" class="track" aria-hidden="true"
        ><i :style="{ width: `${(values.mana / values.maxMana) * 100}%` }"
      /></span>

      <small>{{ t('card.peek.manaGain', { n: text.precise(values.manaPerAttack) }) }}</small>
    </div>
  </div>
</template>

<style scoped>
.resources {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.resource {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.health {
  --color: var(--heal);
}
.mana {
  --color: var(--mana);
}
.reading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.reading span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--chalk-dim);
  font-size: 13px;
}
.reading svg {
  color: var(--color);
}
.reading strong {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.track {
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}
.track i {
  display: block;
  height: 100%;
  background: var(--color);
}
small {
  color: var(--color);
  font-size: 12px;
}
</style>
