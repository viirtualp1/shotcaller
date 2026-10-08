<script setup lang="ts">
import type { TitleId } from '@/content/progression'
import { useGameText } from '../../composables/useGameText'
defineProps<{ title?: TitleId | null }>()
const { t } = useGameText()
</script>
<template><small v-if="title" class="coach-title">{{ t(`cosmetics.titles.${title}`) }}</small></template>
<style scoped>.coach-title { display: block; color: var(--gold); font-size: 11px; font-weight: 600; letter-spacing: 0.03em; }</style>
