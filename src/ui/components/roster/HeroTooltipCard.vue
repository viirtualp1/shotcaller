<script setup lang="ts">
import type { HeroId, ItemId, StarLevel } from '@/content/ids'
import type { TalentChoice } from '@/content/talents'
import HeroDetails from '../common/HeroDetails.vue'
import TalentPicker from './TalentPicker.vue'

/**
 * The full hero sheet for a tooltip, talents included: in the shop and on the bench the hero has no card to open
 * yet, so hovering is the only way to read its ability. Talents are shown, never picked, from here.
 */
withDefaults(
  defineProps<{
    heroId: HeroId
    stars: StarLevel
    items?: readonly ItemId[]
    souls?: number
    talent?: TalentChoice
  }>(),
  {
    items: () => [],
    souls: 0,
    talent: undefined,
  },
)
</script>

<template>
  <div class="hero-tooltip-card">
    <HeroDetails :hero-id="heroId" :stars="stars" :items="items" :souls="souls" :talent="talent" />
    <TalentPicker :hero-id="heroId" :stars="stars" :talent="talent" :can-choose="false" />
  </div>
</template>

<style scoped>
.hero-tooltip-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 300px;
  max-width: 100%;
}
</style>
