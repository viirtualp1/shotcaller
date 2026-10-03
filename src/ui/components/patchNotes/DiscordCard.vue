<script setup lang="ts">
import { discordInstallUrl, IN_DISCORD } from '@/application/discord'
import { useGameText } from '../../composables/useGameText'
import DiscordIcon from '../common/DiscordIcon.vue'
import PatchCard from './PatchCard.vue'

const { t } = useGameText()
/** Inside the Activity the player is already in Discord. */
const href = IN_DISCORD ? null : discordInstallUrl(import.meta.env)
</script>

<template>
  <PatchCard
    v-if="href"
    :href="href"
    :icon="DiscordIcon"
    :eyebrow="t('start.discord.eyebrow')"
    :title="t('start.discord.title')"
    :action="t('start.discord.action')"
    class="discord-card"
    target="_blank"
    rel="noopener"
  />
</template>

<style scoped>
.discord-card :deep(.icon) {
  background: rgba(88, 101, 242, 0.18);
  color: #8b95ff;
}
</style>
