<script setup lang="ts">
import { computed } from 'vue'
import { useMatchStore } from '../../stores/match'
import HeroMeterList from './HeroMeterList.vue'
import type { MeterStat } from './meter'

export type { MeterStat } from './meter'

defineProps<{ stat: MeterStat }>()
const store = useMatchStore()
const heroes = computed(() => [...(store.live?.heroes.values() ?? [])])
</script>

<template>
  <HeroMeterList :heroes="heroes" :stat="stat" class="live-meter" />
</template>

<style scoped>
.live-meter {
  flex: 1 1 auto;
}
</style>
