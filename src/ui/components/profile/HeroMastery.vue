<script setup lang="ts">
import { computed } from 'vue'
import type { HeroRecord } from '@/domain/profile/Profile'
import { heroMastery, MASTERY_STEPS } from '@/domain/profile/cosmetics'
import { useGameText } from '../../composables/useGameText'
const props = defineProps<{ record?: Pick<HeroRecord, 'matches' | 'wins'> }>()
const { t } = useGameText()
const stars = computed(() => heroMastery(props.record))
const next = computed(() => MASTERY_STEPS[stars.value])
const label = computed(() => t('cosmetics.mastery', { n: stars.value }) + (next.value ? ' · ' + t('cosmetics.masteryNext', { matches: next.value.matches, wins: next.value.wins }) : ''))
</script>
<template><span class="mastery" :title="label" :aria-label="label"><span aria-hidden="true">{{ '★'.repeat(stars) }}{{ '☆'.repeat(5 - stars) }}</span></span></template>
<style scoped>.mastery { display: inline-block; color: var(--gold); letter-spacing: 2px; font-size: 12px; }</style>
