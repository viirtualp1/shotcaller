<script setup lang="ts">
import { Globe } from 'lucide-vue-next'
import { useGameText } from '../../composables/useGameText'
import PatchCard from './PatchCard.vue'

/** The address this build used to live at. An installed app keeps that origin too. */
const LEGACY_HOST = 'shotcaller-nine.vercel.app'
const NEW_ORIGIN = 'https://theshotcaller.online/'

const { t } = useGameText()
const show = globalThis.location.hostname === LEGACY_HOST
</script>

<template>
  <PatchCard
    v-if="show"
    :href="NEW_ORIGIN"
    :icon="Globe"
    :eyebrow="t('start.move.eyebrow')"
    :title="t('start.move.title')"
    :action="t('start.move.action')"
  />
</template>
