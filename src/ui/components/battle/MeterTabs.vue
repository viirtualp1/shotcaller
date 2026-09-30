<script setup lang="ts">
import { HeartPulse, ShieldHalf, Swords } from '@lucide/vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { computed, type Component } from 'vue'
import { useGameText } from '../../composables/useGameText'
import type { MeterStat } from './DamageMeter.vue'

const STATS: readonly { readonly id: MeterStat; readonly icon: Component }[] = [
  {
    id: 'damageDealt',
    icon: Swords,
  },
  {
    id: 'healing',
    icon: HeartPulse,
  },
  {
    id: 'damageReceived',
    icon: ShieldHalf,
  },
]

const stat = defineModel<MeterStat>({ required: true })
const { t } = useGameText()

/* A toggle group lets its pressed item be pressed off; a tab stays on until another one is picked. */
const model = computed({
  get: () => stat.value,
  set: (value: string | undefined) => {
    if (value) {
      stat.value = value as MeterStat
    }
  },
})
</script>

<template>
  <ToggleGroupRoot v-model="model" type="single" class="tab-list" :aria-label="t('summary.heroes')">
    <ToggleGroupItem v-for="item in STATS" :key="item.id" :value="item.id" class="tab">
      <component :is="item.icon" :size="14" /> {{ t(`battle.${item.id}`) }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>
