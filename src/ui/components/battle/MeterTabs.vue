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

/** Training dummies make damage taken meaningless, so the training ground shows only damage and healing. */
const props = defineProps<{ training?: boolean }>()
const stat = defineModel<MeterStat>({ required: true })
const { t } = useGameText()

const stats = computed(() => (props.training ? STATS.filter((item) => item.id !== 'damageReceived') : STATS))

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
    <ToggleGroupItem v-for="item in stats" :key="item.id" :value="item.id" class="tab">
      <component :is="item.icon" :size="14" /> {{ t(`battle.${item.id}`) }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>
